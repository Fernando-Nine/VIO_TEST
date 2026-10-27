// WASAPI process loopback (Windows 10 2004+): the audio of one application tree, or of
// the whole PC minus VIO's own tree (the call's voices).
// No files, network or global audio hook; the PCM only goes to the local window.
use crate::wire;
use serde::Serialize;
use std::{
    collections::{HashMap, HashSet, VecDeque},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Condvar, Mutex,
    },
    thread::JoinHandle,
    time::{Duration, Instant},
};
use windows::{
    core::{implement, Interface, Ref, Result as WinResult, BOOL, HRESULT},
    Wdk::System::SystemServices::RtlGetVersion,
    Win32::{
        Foundation::{CloseHandle, E_FAIL, FILETIME, HANDLE, HWND, LPARAM, WAIT_OBJECT_0, WAIT_TIMEOUT},
        Media::Audio::*,
        Security::Cryptography::{BCryptGenRandom, BCRYPT_USE_SYSTEM_PREFERRED_RNG},
        System::{
            Com::{CoInitializeEx, CoUninitialize, IAgileObject, IAgileObject_Impl, StructuredStorage::PROPVARIANT, BLOB, COINIT_MULTITHREADED},
            Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS},
            SystemInformation::OSVERSIONINFOW,
            Threading::{
                CreateEventW, GetCurrentProcessId, GetProcessTimes, OpenProcess, SetEvent,
                WaitForMultipleObjects, WaitForSingleObject, PROCESS_QUERY_LIMITED_INFORMATION,
                PROCESS_SYNCHRONIZE,
            },
            Variant::VT_BLOB,
        },
        UI::WindowsAndMessaging::{
            EnumWindows, GetWindowLongPtrW, GetWindowTextW, GetWindowThreadProcessId, IsWindow,
            IsWindowVisible, GWL_EXSTYLE, WS_EX_TOOLWINDOW,
        },
    },
};

const RING_FRAMES: usize = 9600;
const LIST_COOLDOWN: Duration = Duration::from_millis(700);
const LIST_VALID: Duration = Duration::from_secs(60);
/// Windows 10 2004. Microsoft documents 20348, but process loopback works on updated
/// 2004+ (as in OBS); an older or unpatched system fails the activation, not the app.
pub const MIN_BUILD: u32 = 19041;
const SYSTEM_TITLE: &str = "Todo o som do computador, sem o VIO";

/// Owned Win32 handle, closed once.
struct Owned(HANDLE);
// Kernel handles may be used and closed from any thread.
unsafe impl Send for Owned {}
unsafe impl Sync for Owned {}
impl Drop for Owned {
    fn drop(&mut self) {
        if !self.0.is_invalid() {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }
}

pub fn windows_build() -> u32 {
    let mut info = OSVERSIONINFOW {
        dwOSVersionInfoSize: std::mem::size_of::<OSVERSIONINFOW>() as u32,
        ..Default::default()
    };
    if unsafe { RtlGetVersion(&mut info) }.is_ok() {
        info.dwBuildNumber
    } else {
        0
    }
}

fn key() -> Result<String, String> {
    let mut bytes = [0u8; 16];
    unsafe { BCryptGenRandom(None, &mut bytes, BCRYPT_USE_SYSTEM_PREFERRED_RNG) }
        .ok()
        .map_err(|_| "Não foi possível iniciar a captura com segurança.")?;
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}

fn process_started(process: HANDLE) -> u64 {
    let (mut created, mut exited, mut kernel, mut user) = (
        FILETIME::default(),
        FILETIME::default(),
        FILETIME::default(),
        FILETIME::default(),
    );
    match unsafe { GetProcessTimes(process, &mut created, &mut exited, &mut kernel, &mut user) } {
        Ok(()) => ((created.dwHighDateTime as u64) << 32) | created.dwLowDateTime as u64,
        Err(_) => 0,
    }
}

fn open_process(pid: u32) -> Option<Owned> {
    unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_SYNCHRONIZE, false, pid) }
        .ok()
        .map(Owned)
}

/// This host and all of its WebView2 subprocesses.
fn own_tree() -> HashSet<u32> {
    let mut excluded = HashSet::from([unsafe { GetCurrentProcessId() }]);
    let Ok(snapshot) = (unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }) else {
        return excluded;
    };
    let snapshot = Owned(snapshot);
    let mut changed = true;
    while changed {
        changed = false;
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        let mut more = unsafe { Process32FirstW(snapshot.0, &mut entry) }.is_ok();
        while more {
            if excluded.contains(&entry.th32ParentProcessID) && excluded.insert(entry.th32ProcessID) {
                changed = true;
            }
            more = unsafe { Process32NextW(snapshot.0, &mut entry) }.is_ok();
        }
    }
    excluded
}

#[derive(Clone)]
struct NativeSource {
    window: isize,
    started: u64,
    pid: u32,
    title: String,
    /// Everything the PC plays except this process tree (WebView2 renders the call there).
    system: bool,
}

struct Enumeration {
    excluded: HashSet<u32>,
    seen: HashSet<u32>,
    found: Vec<NativeSource>,
}

unsafe extern "system" fn visit(window: HWND, data: LPARAM) -> BOOL {
    let list = unsafe { &mut *(data.0 as *mut Enumeration) };
    if list.found.len() >= 128 {
        return false.into();
    }
    let tool = unsafe { GetWindowLongPtrW(window, GWL_EXSTYLE) } as u32 & WS_EX_TOOLWINDOW.0 != 0;
    if !unsafe { IsWindowVisible(window) }.as_bool() || tool {
        return true.into();
    }
    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(window, Some(&mut pid)) };
    if pid == 0 || list.excluded.contains(&pid) || list.seen.contains(&pid) {
        return true.into();
    }
    let mut title = [0u16; 256];
    let length = unsafe { GetWindowTextW(window, &mut title) };
    if length <= 0 {
        return true.into();
    }
    let Some(process) = open_process(pid) else {
        return true.into();
    };
    let started = process_started(process.0);
    if started == 0 {
        return true.into();
    }
    list.seen.insert(pid);
    list.found.push(NativeSource {
        window: window.0 as isize,
        started,
        pid,
        title: String::from_utf16_lossy(&title[..length as usize]),
        system: false,
    });
    true.into()
}

fn enumerate() -> Vec<NativeSource> {
    let mut list = Enumeration {
        excluded: own_tree(),
        seen: HashSet::new(),
        found: Vec::new(),
    };
    unsafe {
        let _ = EnumWindows(Some(visit), LPARAM(&mut list as *mut Enumeration as isize));
    }
    list.found
}

// The handler owns its sender, so a late completion never touches the worker's stack.
#[implement(IActivateAudioInterfaceCompletionHandler, IAgileObject)]
struct Activation(Mutex<Option<mpsc::SyncSender<WinResult<IAudioClient>>>>);

// Marker: completion may arrive on any MTA thread.
impl IAgileObject_Impl for Activation_Impl {}

impl IActivateAudioInterfaceCompletionHandler_Impl for Activation_Impl {
    fn ActivateCompleted(&self, operation: Ref<IActivateAudioInterfaceAsyncOperation>) -> WinResult<()> {
        let result = (|| {
            let operation = operation.ok()?;
            let mut activated = HRESULT(0);
            let mut unknown = None;
            unsafe { operation.GetActivateResult(&mut activated, &mut unknown) }?;
            activated.ok()?;
            unknown.ok_or(windows::core::Error::from(E_FAIL))?.cast::<IAudioClient>()
        })();
        if let Some(sender) = self.0.lock().ok().and_then(|mut s| s.take()) {
            let _ = sender.try_send(result);
        }
        Ok(())
    }
}

#[derive(Default)]
struct State {
    ring: VecDeque<f32>,
    state: u32,
    error: u32,
    dropped: u32,
    sequence: u32,
}

struct Shared {
    state: Mutex<State>,
    available: Condvar,
    stopping: AtomicBool,
    stop_event: Owned,
}

impl Shared {
    fn finish(&self, result: WinResult<()>) {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        let stopping = self.stopping.load(Ordering::Acquire);
        state.state = if stopping || result.is_ok() { 2 } else { 3 };
        state.error = match &result {
            Err(e) if !stopping => e.code().0 as u32,
            _ => 0,
        };
        state.ring.clear();
        self.available.notify_all();
    }

    fn push(&self, samples: &[i16], silent: bool, discontinuity: bool) {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        if discontinuity {
            state.ring.clear();
            state.dropped = state.dropped.wrapping_add(1);
        }
        for &sample in samples {
            if state.ring.len() >= RING_FRAMES * 2 {
                // Drop the oldest frame rather than delaying the live stream.
                state.ring.pop_front();
                state.ring.pop_front();
            }
            state.ring.push_back(if silent { 0.0 } else { sample as f32 / 32768.0 });
        }
        if state.ring.len() >= 960 {
            self.available.notify_one();
        }
    }

    fn run(&self, pid: u32, system: bool, process: &Owned) -> WinResult<()> {
        let mut parameters = AUDIOCLIENT_ACTIVATION_PARAMS {
            ActivationType: AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK,
            Anonymous: AUDIOCLIENT_ACTIVATION_PARAMS_0 {
                ProcessLoopbackParams: AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS {
                    TargetProcessId: pid,
                    ProcessLoopbackMode: if system {
                        PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE
                    } else {
                        PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE
                    },
                },
            },
        };
        let mut property = PROPVARIANT::default();
        unsafe {
            let inner = &mut *property.Anonymous.Anonymous;
            inner.vt = VT_BLOB;
            inner.Anonymous.blob = BLOB {
                cbSize: std::mem::size_of::<AUDIOCLIENT_ACTIVATION_PARAMS>() as u32,
                pBlobData: &mut parameters as *mut _ as *mut u8,
            };
        }
        let (sender, receiver) = mpsc::sync_channel(1);
        let handler: IActivateAudioInterfaceCompletionHandler =
            Activation(Mutex::new(Some(sender))).into();
        let _operation = unsafe {
            ActivateAudioInterfaceAsync(
                VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
                &IAudioClient::IID,
                Some(&property),
                &handler,
            )
        }?;
        let deadline = Instant::now() + Duration::from_secs(5);
        let client = loop {
            if self.stopping.load(Ordering::Acquire) {
                return Ok(());
            }
            match receiver.recv_timeout(Duration::from_millis(100)) {
                Ok(result) => break result?,
                Err(mpsc::RecvTimeoutError::Timeout) if Instant::now() < deadline => continue,
                Err(_) => return Err(windows::core::Error::from(E_FAIL)),
            }
        };
        let format = WAVEFORMATEX {
            wFormatTag: WAVE_FORMAT_PCM as u16,
            nChannels: 2,
            nSamplesPerSec: 48000,
            nAvgBytesPerSec: 192000,
            nBlockAlign: 4,
            wBitsPerSample: 16,
            cbSize: 0,
        };
        unsafe {
            client.Initialize(
                AUDCLNT_SHAREMODE_SHARED,
                AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
                0,
                0,
                &format,
                None,
            )?;
        }
        let reader: IAudioCaptureClient = unsafe { client.GetService() }?;
        let samples = Owned(unsafe { CreateEventW(None, false, false, None) }?);
        unsafe {
            client.SetEventHandle(samples.0)?;
            client.Start()?;
        }
        {
            let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
            state.state = 1;
            self.available.notify_all();
        }
        let events = [self.stop_event.0, process.0, samples.0];
        let result = (|| -> WinResult<()> {
            while !self.stopping.load(Ordering::Acquire) {
                let event = unsafe { WaitForMultipleObjects(&events, false, 1000) };
                if event == WAIT_TIMEOUT {
                    continue;
                }
                if event.0 != WAIT_OBJECT_0.0 + 2 {
                    // Stop requested or the application closed.
                    return Ok(());
                }
                loop {
                    let frames = unsafe { reader.GetNextPacketSize() }?;
                    if frames == 0 || self.stopping.load(Ordering::Acquire) {
                        break;
                    }
                    let mut data = std::ptr::null_mut();
                    let mut frames = 0u32;
                    let mut flags = 0u32;
                    unsafe { reader.GetBuffer(&mut data, &mut frames, &mut flags, None, None) }?;
                    let silent = flags & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32 != 0;
                    let discontinuity = flags & AUDCLNT_BUFFERFLAGS_DATA_DISCONTINUITY.0 as u32 != 0;
                    let pcm = if data.is_null() || frames == 0 {
                        &[][..]
                    } else {
                        unsafe { std::slice::from_raw_parts(data as *const i16, frames as usize * 2) }
                    };
                    self.push(pcm, silent || data.is_null(), discontinuity);
                    unsafe { reader.ReleaseBuffer(frames) }?;
                }
            }
            Ok(())
        })();
        unsafe {
            let _ = client.Stop();
        }
        result
    }
}

pub struct Capture {
    shared: Arc<Shared>,
    worker: Mutex<Option<JoinHandle<()>>>,
    reading: AtomicBool,
}

impl Capture {
    fn start(source: &NativeSource) -> Result<Self, String> {
        let closed = || "O aplicativo foi fechado ou não permite captura. Atualize a lista.".to_string();
        let process = if source.system {
            open_process(unsafe { GetCurrentProcessId() }).ok_or_else(closed)?
        } else {
            let window = HWND(source.window as *mut _);
            let mut current = 0u32;
            unsafe { GetWindowThreadProcessId(window, Some(&mut current)) };
            if !unsafe { IsWindow(Some(window)) }.as_bool() || current != source.pid {
                return Err(closed());
            }
            let process = open_process(source.pid).ok_or_else(closed)?;
            if process_started(process.0) != source.started
                || unsafe { WaitForSingleObject(process.0, 0) } != WAIT_TIMEOUT
            {
                return Err(closed());
            }
            process
        };
        let stop_event = Owned(unsafe { CreateEventW(None, true, false, None) }.map_err(|_| closed())?);
        let shared = Arc::new(Shared {
            state: Mutex::new(State::default()),
            available: Condvar::new(),
            stopping: AtomicBool::new(false),
            stop_event,
        });
        let worker_shared = shared.clone();
        let (pid, system) = (source.pid, source.system);
        let worker = std::thread::spawn(move || {
            let shared = worker_shared;
            if let Err(e) = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) }.ok() {
                shared.finish(Err(e));
                return;
            }
            let result = shared.run(pid, system, &process);
            shared.finish(result);
            unsafe { CoUninitialize() };
        });
        Ok(Self {
            shared,
            worker: Mutex::new(Some(worker)),
            reading: AtomicBool::new(false),
        })
    }

    fn stop(&self) {
        self.shared.stopping.store(true, Ordering::Release);
        unsafe {
            let _ = SetEvent(self.shared.stop_event.0);
        }
        self.shared.available.notify_all();
        let worker = self.worker.lock().ok().and_then(|mut w| w.take());
        if let Some(worker) = worker {
            let _ = worker.join();
        }
    }

    /// Waits up to 20 ms for 10 ms of audio; one outstanding read at a time.
    pub fn read(&self) -> Result<Vec<u8>, String> {
        if self.reading.swap(true, Ordering::AcqRel) {
            return Err("Já existe uma leitura de áudio em andamento.".into());
        }
        let shared = &self.shared;
        let state = shared.state.lock().unwrap_or_else(|e| e.into_inner());
        let (mut state, _) = shared
            .available
            .wait_timeout_while(state, Duration::from_millis(20), |s| {
                s.ring.len() < 960 && s.state < 2 && !shared.stopping.load(Ordering::Acquire)
            })
            .unwrap_or_else(|e| e.into_inner());
        let stopping = shared.stopping.load(Ordering::Acquire);
        let take = if stopping {
            0
        } else {
            state.ring.len().min(wire::MAX_FRAMES * 2) & !1
        };
        let pcm: Vec<f32> = state.ring.drain(..take).collect();
        let sequence = state.sequence;
        state.sequence = state.sequence.wrapping_add(1);
        let bytes = wire::packet(
            if stopping { 2 } else { state.state },
            sequence,
            state.dropped,
            state.error,
            &pcm,
        );
        drop(state);
        self.reading.store(false, Ordering::Release);
        Ok(bytes)
    }
}

impl Drop for Capture {
    fn drop(&mut self) {
        self.stop();
    }
}

#[derive(Serialize)]
pub struct Source {
    id: String,
    title: String,
    system: bool,
}

#[derive(Default)]
struct Inner {
    sources: HashMap<String, NativeSource>,
    listed: Option<Instant>,
    started: Option<Instant>,
    active: Option<(String, Arc<Capture>)>,
}

#[derive(Default)]
pub struct Manager(Mutex<Inner>);

impl Manager {
    pub fn sources(&self) -> Result<Vec<Source>, String> {
        let mut inner = self.0.lock().map_err(|_| "A captura está indisponível.")?;
        if inner.listed.is_some_and(|t| t.elapsed() < LIST_COOLDOWN) {
            return Err("Aguarde um instante antes de atualizar a lista.".into());
        }
        inner.sources.clear();
        inner.listed = Some(Instant::now());
        let mut sources = Vec::new();
        let system = NativeSource {
            window: 0,
            started: 0,
            pid: unsafe { GetCurrentProcessId() },
            title: SYSTEM_TITLE.into(),
            system: true,
        };
        for entry in std::iter::once(system).chain(enumerate()) {
            // Opaque ids: the page never sees or chooses a PID.
            let id = key()?;
            sources.push(Source {
                id: id.clone(),
                title: entry.title.clone(),
                system: entry.system,
            });
            inner.sources.insert(id, entry);
        }
        // The whole-PC option stays first; applications follow by name.
        sources[1..].sort_by_key(|s| s.title.to_lowercase());
        Ok(sources)
    }

    pub fn start(&self, source_id: &str) -> Result<String, String> {
        let mut inner = self.0.lock().map_err(|_| "A captura está indisponível.")?;
        if windows_build() < MIN_BUILD {
            return Err("O som da janela precisa do Windows 10 versão 2004 ou mais recente.".into());
        }
        if inner.active.is_some() {
            return Err("Encerre o compartilhamento atual antes de iniciar outro.".into());
        }
        if inner.started.is_some_and(|t| t.elapsed() < LIST_COOLDOWN) {
            return Err("Aguarde um instante antes de tentar novamente.".into());
        }
        if !inner.listed.is_some_and(|t| t.elapsed() < LIST_VALID) {
            return Err("Atualize a lista e escolha novamente o aplicativo.".into());
        }
        let source = inner
            .sources
            .remove(source_id)
            .ok_or("Escolha um aplicativo da lista atual.")?;
        inner.started = Some(Instant::now());
        let capture = Capture::start(&source)?;
        let id = key()?;
        inner.active = Some((id.clone(), Arc::new(capture)));
        Ok(id)
    }

    pub fn capture(&self, id: &str) -> Result<Arc<Capture>, String> {
        let inner = self.0.lock().map_err(|_| "A captura está indisponível.")?;
        inner
            .active
            .as_ref()
            .filter(|(key, _)| key == id)
            .map(|(_, c)| c.clone())
            .ok_or_else(|| "A captura já foi encerrada.".into())
    }

    pub fn stop(&self, id: Option<&str>) {
        let capture = self.0.lock().ok().and_then(|mut inner| {
            if inner
                .active
                .as_ref()
                .is_some_and(|(key, _)| id.is_none_or(|id| id == key))
            {
                inner.active.take().map(|(_, capture)| capture)
            } else {
                None
            }
        });
        // Never join the worker while holding the manager lock.
        if let Some(capture) = capture {
            capture.stop();
        }
    }
}

impl Drop for Manager {
    fn drop(&mut self) {
        self.stop(None);
    }
}

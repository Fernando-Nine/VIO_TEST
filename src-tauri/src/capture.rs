use crate::wire;
use serde::Serialize;
use std::{
    collections::HashMap,
    ffi::c_void,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};

#[repr(C)]
#[derive(Clone, Copy)]
struct NativeSource {
    window: u64,
    started: u64,
    pid: u32,
    title: [u16; 256],
}
#[repr(C)]
struct NativePacket {
    state: u32,
    sequence: u32,
    dropped: u32,
    frames: u32,
    error: u32,
}
extern "C" {
    fn vio_windows_build() -> u32;
    fn vio_random(output: *mut u8, length: u32) -> bool;
    fn vio_sources(output: *mut NativeSource, capacity: u32) -> u32;
    fn vio_capture_create(source: *const NativeSource) -> *mut c_void;
    fn vio_capture_stop(capture: *mut c_void);
    fn vio_capture_read(capture: *mut c_void, output: *mut f32, frames: u32) -> NativePacket;
    fn vio_capture_destroy(capture: *mut c_void);
}
pub fn windows_build() -> u32 {
    unsafe { vio_windows_build() }
}
fn key() -> Result<String, String> {
    let mut bytes = [0u8; 16];
    if !unsafe { vio_random(bytes.as_mut_ptr(), 16) } {
        return Err("Não foi possível iniciar a captura com segurança.".into());
    }
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}
pub struct Capture(*mut c_void, AtomicBool);
// The C++ object synchronizes reads and stop, and owns its worker until Drop joins it.
unsafe impl Send for Capture {}
unsafe impl Sync for Capture {}
impl Capture {
    fn stop(&self) {
        unsafe { vio_capture_stop(self.0) }
    }
    pub fn read(&self) -> Result<Vec<u8>, String> {
        if self.1.swap(true, Ordering::AcqRel) {
            return Err("Já existe uma leitura de áudio em andamento.".into());
        }
        let mut pcm = vec![0f32; wire::MAX_FRAMES * 2];
        let packet = unsafe { vio_capture_read(self.0, pcm.as_mut_ptr(), wire::MAX_FRAMES as u32) };
        pcm.truncate((packet.frames as usize).min(wire::MAX_FRAMES) * 2);
        let bytes = wire::packet(
            packet.state,
            packet.sequence,
            packet.dropped,
            packet.error,
            &pcm,
        );
        self.1.store(false, Ordering::Release);
        Ok(bytes)
    }
}
impl Drop for Capture {
    fn drop(&mut self) {
        unsafe { vio_capture_destroy(self.0) }
    }
}
#[derive(Serialize)]
pub struct Source {
    id: String,
    title: String,
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
        if inner
            .listed
            .is_some_and(|t| t.elapsed() < Duration::from_millis(700))
        {
            return Err("Aguarde um instante antes de atualizar a lista.".into());
        }
        let empty = NativeSource {
            window: 0,
            started: 0,
            pid: 0,
            title: [0; 256],
        };
        let mut native = [empty; 128];
        let count = unsafe { vio_sources(native.as_mut_ptr(), 128) }.min(128);
        inner.sources.clear();
        inner.listed = Some(Instant::now());
        let mut sources = Vec::new();
        for entry in native.iter().take(count as usize) {
            let id = key()?;
            let end = entry.title.iter().position(|c| *c == 0).unwrap_or(256);
            let title = String::from_utf16_lossy(&entry.title[..end]);
            inner.sources.insert(id.clone(), *entry);
            sources.push(Source { id, title });
        }
        sources.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
        Ok(sources)
    }
    pub fn start(&self, source_id: &str) -> Result<String, String> {
        let mut inner = self.0.lock().map_err(|_| "A captura está indisponível.")?;
        if windows_build() < 22000 {
            return Err("O áudio por aplicativo precisa do Windows 11.".into());
        }
        if inner.active.is_some() {
            return Err("Encerre o compartilhamento atual antes de iniciar outro.".into());
        }
        if inner
            .started
            .is_some_and(|t| t.elapsed() < Duration::from_millis(700))
        {
            return Err("Aguarde um instante antes de tentar novamente.".into());
        }
        if !inner
            .listed
            .is_some_and(|t| t.elapsed() < Duration::from_secs(60))
        {
            return Err("Atualize a lista e escolha novamente o aplicativo.".into());
        }
        let source = inner
            .sources
            .remove(source_id)
            .ok_or("Escolha um aplicativo da lista atual.")?;
        let id = key()?;
        inner.started = Some(Instant::now());
        let handle = unsafe { vio_capture_create(&source) };
        if handle.is_null() {
            return Err(
                "O aplicativo foi fechado ou não permite captura. Atualize a lista.".into(),
            );
        }
        inner.active = Some((
            id.clone(),
            Arc::new(Capture(handle, AtomicBool::new(false))),
        ));
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
                .is_some_and(|(key, _)| id.is_none() || id == Some(key.as_str()))
            {
                inner.active.take().map(|(_, capture)| capture)
            } else {
                None
            }
        });
        // Never join a worker while holding the manager lock.
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

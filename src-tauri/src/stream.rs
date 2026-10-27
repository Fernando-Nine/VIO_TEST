// Native screen video (#192): Windows.Graphics.Capture frames are scaled and converted
// to NV12 on the GPU, read back once and written into a WebView2 SharedBuffer. The page
// turns them into a MediaStreamTrackGenerator track; pixels never cross the IPC, which
// only carries a small "frame N is in slot S" tick. Nothing leaves the PC except through
// the page's own WebRTC connections.
use crate::{
    capture::{key, Owned},
    video::{borderless, Apartment, Gpu, VideoManager},
    wire,
};
use serde::Serialize;
use std::{
    collections::HashMap,
    sync::{
        atomic::{fence, AtomicBool, Ordering},
        mpsc, Arc, Condvar, Mutex,
    },
    thread::JoinHandle,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager as _, WebviewWindow};
use webview2_com::Microsoft::Web::WebView2::Win32::{
    ICoreWebView2Environment12, ICoreWebView2SharedBuffer, ICoreWebView2_17,
    COREWEBVIEW2_SHARED_BUFFER_ACCESS_READ_ONLY,
};
use windows::{
    core::{Interface, HSTRING},
    Foundation::{TimeSpan, TypedEventHandler},
    Graphics::{
        Capture::{Direct3D11CaptureFramePool, GraphicsCaptureItem},
        DirectX::DirectXPixelFormat,
        SizeInt32,
    },
    Win32::{
        Foundation::{HANDLE, RECT, WAIT_OBJECT_0, WAIT_TIMEOUT},
        Graphics::{
            Direct3D11::*,
            Dxgi::Common::{
                DXGI_COLOR_SPACE_RGB_FULL_G22_NONE_P709, DXGI_COLOR_SPACE_YCBCR_STUDIO_G22_LEFT_P709,
                DXGI_FORMAT, DXGI_FORMAT_NV12, DXGI_RATIONAL, DXGI_SAMPLE_DESC,
            },
        },
        System::{
            Threading::{CreateEventW, SetEvent, WaitForMultipleObjects},
            WinRT::Direct3D11::IDirect3DDxgiInterfaceAccess,
        },
    },
};

pub const MAX_STREAMS: usize = 3;
const MAX_WIDTH: u32 = 3840;
const MAX_HEIGHT: u32 = 2160;
/// Black in studio-range YCbCr.
const BLACK: D3D11_VIDEO_COLOR = D3D11_VIDEO_COLOR {
    Anonymous: D3D11_VIDEO_COLOR_0 {
        YCbCr: D3D11_VIDEO_COLOR_YCbCrA {
            Y: 0.0625,
            Cb: 0.5,
            Cr: 0.5,
            A: 1.0,
        },
    },
};

/// The SharedBuffer COM object lives on the UI thread; only its mapping crosses threads.
struct UiBuffer(ICoreWebView2SharedBuffer);
unsafe impl Send for UiBuffer {}

#[derive(Clone, Copy)]
struct Mapping(*mut u8, usize);
// The mapping stays valid until the UI thread closes the buffer, after the worker joins.
unsafe impl Send for Mapping {}

#[derive(Default, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tick {
    /// Last written frame; 0 before the first.
    sequence: u32,
    slot: u32,
    /// 0 starting, 1 running, 2 ended (window closed or stopped), 3 failed.
    state: u32,
    /// Frames written and GPU→page milliseconds over the last full second, for the bench.
    fps: u32,
    busy_ms: f32,
    /// False when the GPU has no video processor and NV12 is made on the CPU.
    gpu: bool,
}

struct Frames {
    tick: Mutex<Tick>,
    changed: Condvar,
    stopping: AtomicBool,
    closed: Arc<AtomicBool>,
    stop_event: Owned,
    frame_event: Owned,
}

impl Frames {
    fn set(&self, update: impl FnOnce(&mut Tick)) {
        let mut tick = self.tick.lock().unwrap_or_else(|e| e.into_inner());
        update(&mut tick);
        self.changed.notify_all();
    }
}

#[derive(Clone, Copy)]
pub struct Options {
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub cursor: bool,
}

/// GPU path: the video processor scales and converts; only NV12 is read back.
struct Processor {
    video: ID3D11VideoContext1,
    device: ID3D11VideoDevice,
    enumerator: ID3D11VideoProcessorEnumerator,
    processor: ID3D11VideoProcessor,
    output_view: ID3D11VideoProcessorOutputView,
    output: ID3D11Texture2D,
    staging: ID3D11Texture2D,
}

enum Path {
    Gpu(Processor),
    /// No video processor (basic display driver, VMs): BGRA is read back and converted here.
    Cpu {
        staging: Option<(ID3D11Texture2D, u32, u32)>,
        nv12: Vec<u8>,
    },
}

struct Pipeline {
    gpu: Gpu,
    path: Path,
    width: u32,
    height: u32,
}

fn texture(gpu: &Gpu, width: u32, height: u32, format: DXGI_FORMAT, staging: bool) -> windows::core::Result<ID3D11Texture2D> {
    let desc = D3D11_TEXTURE2D_DESC {
        Width: width,
        Height: height,
        MipLevels: 1,
        ArraySize: 1,
        Format: format,
        SampleDesc: DXGI_SAMPLE_DESC { Count: 1, Quality: 0 },
        Usage: if staging { D3D11_USAGE_STAGING } else { D3D11_USAGE_DEFAULT },
        BindFlags: if staging { 0 } else { D3D11_BIND_RENDER_TARGET.0 as u32 },
        CPUAccessFlags: if staging { D3D11_CPU_ACCESS_READ.0 as u32 } else { 0 },
        MiscFlags: 0,
    };
    let mut texture = None;
    unsafe { gpu.device.CreateTexture2D(&desc, None, Some(&mut texture)) }?;
    texture.ok_or(windows::core::Error::empty())
}

impl Processor {
    fn new(gpu: &Gpu, input: SizeInt32, options: Options) -> windows::core::Result<Self> {
        let device: ID3D11VideoDevice = gpu.device.cast()?;
        let video: ID3D11VideoContext1 = gpu.context.cast()?;
        let rate = DXGI_RATIONAL {
            Numerator: options.fps,
            Denominator: 1,
        };
        let content = D3D11_VIDEO_PROCESSOR_CONTENT_DESC {
            InputFrameFormat: D3D11_VIDEO_FRAME_FORMAT_PROGRESSIVE,
            InputFrameRate: rate,
            InputWidth: input.Width.max(2) as u32,
            InputHeight: input.Height.max(2) as u32,
            OutputFrameRate: rate,
            OutputWidth: options.width,
            OutputHeight: options.height,
            Usage: D3D11_VIDEO_USAGE_PLAYBACK_NORMAL,
        };
        let enumerator = unsafe { device.CreateVideoProcessorEnumerator(&content) }?;
        let processor = unsafe { device.CreateVideoProcessor(&enumerator, 0) }?;
        let output = texture(gpu, options.width, options.height, DXGI_FORMAT_NV12, false)?;
        let staging = texture(gpu, options.width, options.height, DXGI_FORMAT_NV12, true)?;
        let view = D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC {
            ViewDimension: D3D11_VPOV_DIMENSION_TEXTURE2D,
            Anonymous: D3D11_VIDEO_PROCESSOR_OUTPUT_VIEW_DESC_0 {
                Texture2D: D3D11_TEX2D_VPOV { MipSlice: 0 },
            },
        };
        let mut output_view = None;
        unsafe { device.CreateVideoProcessorOutputView(&output, &enumerator, &view, Some(&mut output_view)) }?;
        let output_view = output_view.ok_or(windows::core::Error::empty())?;
        unsafe {
            video.VideoProcessorSetStreamFrameFormat(&processor, 0, D3D11_VIDEO_FRAME_FORMAT_PROGRESSIVE);
            video.VideoProcessorSetStreamAutoProcessingMode(&processor, 0, false);
            video.VideoProcessorSetStreamColorSpace1(&processor, 0, DXGI_COLOR_SPACE_RGB_FULL_G22_NONE_P709);
            video.VideoProcessorSetOutputColorSpace1(&processor, DXGI_COLOR_SPACE_YCBCR_STUDIO_G22_LEFT_P709);
            video.VideoProcessorSetOutputBackgroundColor(&processor, true, &BLACK);
        }
        Ok(Self {
            video,
            device,
            enumerator,
            processor,
            output_view,
            output,
            staging,
        })
    }
}

impl Pipeline {
    fn new(input: SizeInt32, options: Options) -> windows::core::Result<Self> {
        let gpu = Gpu::new()?;
        let path = match Processor::new(&gpu, input, options) {
            Ok(processor) => Path::Gpu(processor),
            Err(_) => Path::Cpu {
                staging: None,
                nv12: vec![0; wire::nv12_size(options.width, options.height)],
            },
        };
        Ok(Self {
            gpu,
            path,
            width: options.width,
            height: options.height,
        })
    }

    fn on_gpu(&self) -> bool {
        matches!(self.path, Path::Gpu(_))
    }

    /// Scales `source` (letterboxed, aspect kept) into NV12 and hands the planes to `write`.
    fn convert(&mut self, source: &ID3D11Texture2D, content: SizeInt32, write: impl FnOnce(&[u8], usize)) -> windows::core::Result<()> {
        let mut desc = D3D11_TEXTURE2D_DESC::default();
        unsafe { source.GetDesc(&mut desc) };
        let (cw, ch) = (
            (content.Width.max(1) as u32).min(desc.Width),
            (content.Height.max(1) as u32).min(desc.Height),
        );
        let (width, height, context) = (self.width, self.height, &self.gpu.context);
        match &mut self.path {
            Path::Gpu(gpu) => {
                let scale = (width as f64 / cw as f64).min(height as f64 / ch as f64);
                let (dw, dh) = ((cw as f64 * scale).round() as i32, (ch as f64 * scale).round() as i32);
                let (dx, dy) = ((width as i32 - dw) / 2, (height as i32 - dh) / 2);
                let view = D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC {
                    FourCC: 0,
                    ViewDimension: D3D11_VPIV_DIMENSION_TEXTURE2D,
                    Anonymous: D3D11_VIDEO_PROCESSOR_INPUT_VIEW_DESC_0 {
                        Texture2D: D3D11_TEX2D_VPIV { MipSlice: 0, ArraySlice: 0 },
                    },
                };
                let mut input = None;
                unsafe { gpu.device.CreateVideoProcessorInputView(source, &gpu.enumerator, &view, Some(&mut input)) }?;
                let stream = D3D11_VIDEO_PROCESSOR_STREAM {
                    Enable: true.into(),
                    pInputSurface: std::mem::ManuallyDrop::new(input),
                    ..Default::default()
                };
                let streams = [stream];
                let result = unsafe {
                    gpu.video.VideoProcessorSetStreamSourceRect(
                        &gpu.processor,
                        0,
                        true,
                        Some(&RECT { left: 0, top: 0, right: cw as i32, bottom: ch as i32 }),
                    );
                    gpu.video.VideoProcessorSetStreamDestRect(
                        &gpu.processor,
                        0,
                        true,
                        Some(&RECT { left: dx, top: dy, right: dx + dw, bottom: dy + dh }),
                    );
                    gpu.video.VideoProcessorBlt(&gpu.processor, &gpu.output_view, 0, &streams)
                };
                let [mut stream] = streams;
                unsafe { std::mem::ManuallyDrop::drop(&mut stream.pInputSurface) };
                result?;
                unsafe { context.CopyResource(&gpu.staging, &gpu.output) };
                let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
                unsafe { context.Map(&gpu.staging, 0, D3D11_MAP_READ, 0, Some(&mut mapped)) }?;
                let pitch = mapped.RowPitch as usize;
                // NV12 staging: Y rows, then interleaved UV rows, both with the same pitch.
                let planes = unsafe { std::slice::from_raw_parts(mapped.pData as *const u8, pitch * (height as usize * 3 / 2)) };
                write(planes, pitch);
                unsafe { context.Unmap(&gpu.staging, 0) };
            }
            Path::Cpu { staging, nv12 } => {
                if !staging.as_ref().is_some_and(|(_, w, h)| (*w, *h) == (desc.Width, desc.Height)) {
                    *staging = Some((texture(&self.gpu, desc.Width, desc.Height, desc.Format, true)?, desc.Width, desc.Height));
                }
                let Some((texture, _, _)) = staging.as_ref() else { unreachable!() };
                unsafe { context.CopyResource(texture, source) };
                let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
                unsafe { context.Map(texture, 0, D3D11_MAP_READ, 0, Some(&mut mapped)) }?;
                let pixels = unsafe { std::slice::from_raw_parts(mapped.pData as *const u8, (mapped.RowPitch * desc.Height) as usize) };
                wire::bgra_to_nv12(pixels, cw, ch, mapped.RowPitch, width, height, nv12);
                unsafe { context.Unmap(texture, 0) };
                write(nv12, width as usize);
            }
        }
        Ok(())
    }
}

/// Copies one NV12 frame into its slot between two sequence marks (a seqlock).
fn publish(mapping: Mapping, width: u32, height: u32, sequence: u32, timestamp: u64, planes: &[u8], pitch: usize) {
    let slot_size = wire::video_slot_size(width, height);
    let slot = (sequence % wire::VIDEO_SLOTS) as usize;
    let base = wire::VIDEO_HEADER + slot * slot_size;
    assert!(base + slot_size <= mapping.1);
    let width = width as usize;
    unsafe {
        let slot = mapping.0.add(base);
        std::ptr::write_volatile(slot as *mut u32, sequence);
        fence(Ordering::SeqCst);
        std::ptr::write_unaligned(slot.add(8) as *mut u64, timestamp);
        let mut out = slot.add(wire::VIDEO_SLOT_HEADER);
        for row in 0..height as usize * 3 / 2 {
            std::ptr::copy_nonoverlapping(planes.as_ptr().add(row * pitch), out, width);
            out = out.add(width);
        }
        fence(Ordering::SeqCst);
        std::ptr::write_volatile(slot.add(4) as *mut u32, sequence);
    }
}

fn run(
    frames: &Frames,
    item: GraphicsCaptureItem,
    options: Options,
    mapping: Mapping,
    ready: mpsc::SyncSender<Result<(), String>>,
) -> windows::core::Result<()> {
    let mut size = item.Size()?;
    let mut pipeline = Pipeline::new(size, options)?;
    let pool = Direct3D11CaptureFramePool::CreateFreeThreaded(
        &pipeline.gpu.winrt,
        DirectXPixelFormat::B8G8R8A8UIntNormalized,
        2,
        size,
    )?;
    let signal = frames.frame_event.0 .0 as isize;
    pool.FrameArrived(&TypedEventHandler::new(move |_, _| {
        unsafe {
            let _ = SetEvent(HANDLE(signal as *mut _));
        }
        Ok(())
    }))?;
    let closed = frames.closed.clone();
    item.Closed(&TypedEventHandler::new(move |_, _| {
        closed.store(true, Ordering::Release);
        unsafe {
            let _ = SetEvent(HANDLE(signal as *mut _));
        }
        Ok(())
    }))?;
    let session = pool.CreateCaptureSession(&item)?;
    let _ = session.SetIsBorderRequired(false);
    let _ = session.SetIsCursorCaptureEnabled(options.cursor);
    let interval = Duration::from_micros(1_000_000 / options.fps as u64);
    // Windows 11 paces the pool itself; older builds rely on the skip below.
    let _ = session.SetMinUpdateInterval(TimeSpan {
        Duration: interval.as_micros() as i64 * 10,
    });
    session.StartCapture()?;
    let gpu = pipeline.on_gpu();
    frames.set(|t| {
        t.state = 1;
        t.gpu = gpu;
    });
    let _ = ready.send(Ok(()));
    let events = [frames.stop_event.0, frames.frame_event.0];
    let (mut sequence, mut due) = (0u32, Instant::now());
    let (mut window, mut written, mut busy) = (Instant::now(), 0u32, Duration::ZERO);
    let result = (|| -> windows::core::Result<()> {
        while !frames.stopping.load(Ordering::Acquire) {
            let event = unsafe { WaitForMultipleObjects(&events, false, 1000) };
            if event == WAIT_OBJECT_0 || frames.closed.load(Ordering::Acquire) {
                return Ok(());
            }
            if event == WAIT_TIMEOUT {
                continue;
            }
            // Keep only the newest frame; late ones are dropped, never queued.
            let mut latest = None;
            while let Ok(frame) = pool.TryGetNextFrame() {
                if let Some(old) = latest.replace(frame) {
                    let _ = old.Close();
                }
            }
            let Some(frame) = latest else { continue };
            let now = Instant::now();
            if now + Duration::from_millis(2) < due {
                let _ = frame.Close();
                continue;
            }
            due = (due + interval).max(now);
            let started = Instant::now();
            let content = frame.ContentSize()?;
            let access: IDirect3DDxgiInterfaceAccess = frame.Surface()?.cast()?;
            let source: ID3D11Texture2D = unsafe { access.GetInterface() }?;
            let timestamp = (frame.SystemRelativeTime()?.Duration / 10) as u64;
            sequence = sequence.wrapping_add(1).max(1);
            pipeline.convert(&source, content, |planes, pitch| {
                publish(mapping, options.width, options.height, sequence, timestamp, planes, pitch)
            })?;
            let _ = frame.Close();
            if content.Width != size.Width || content.Height != size.Height {
                size = content;
                pool.Recreate(&pipeline.gpu.winrt, DirectXPixelFormat::B8G8R8A8UIntNormalized, 2, size)?;
            }
            busy += started.elapsed();
            written += 1;
            let report = window.elapsed() >= Duration::from_secs(1);
            let slot = sequence % wire::VIDEO_SLOTS;
            frames.set(|t| {
                t.sequence = sequence;
                t.slot = slot;
                if report {
                    t.fps = written;
                    t.busy_ms = busy.as_secs_f32() * 1000.0 / written.max(1) as f32;
                }
            });
            if report {
                (window, written, busy) = (Instant::now(), 0, Duration::ZERO);
            }
        }
        Ok(())
    })();
    let _ = session.Close();
    let _ = pool.Close();
    result
}

pub struct Stream {
    frames: Arc<Frames>,
    worker: Mutex<Option<JoinHandle<()>>>,
    buffer: Mutex<Option<UiBuffer>>,
    waiting: AtomicBool,
}

impl Stream {
    /// Waits up to 100 ms for a frame newer than `after`; one outstanding wait at a time.
    pub fn wait(&self, after: u32) -> Result<Tick, String> {
        if self.waiting.swap(true, Ordering::AcqRel) {
            return Err("Já existe uma espera de quadro em andamento.".into());
        }
        let tick = self.frames.tick.lock().unwrap_or_else(|e| e.into_inner());
        let (tick, _) = self
            .frames
            .changed
            .wait_timeout_while(tick, Duration::from_millis(100), |t| t.sequence == after && t.state < 2)
            .unwrap_or_else(|e| e.into_inner());
        let tick = *tick;
        self.waiting.store(false, Ordering::Release);
        Ok(tick)
    }

    fn stop(&self, app: &AppHandle) {
        self.frames.stopping.store(true, Ordering::Release);
        unsafe {
            let _ = SetEvent(self.frames.stop_event.0);
        }
        if let Some(worker) = self.worker.lock().ok().and_then(|mut w| w.take()) {
            let _ = worker.join();
        }
        self.frames.set(|t| t.state = t.state.max(2));
        // The page keeps its view until it calls releaseBuffer; this frees the host side.
        if let Some(buffer) = self.buffer.lock().ok().and_then(|mut b| b.take()) {
            let _ = app.run_on_main_thread(move || {
                let buffer = buffer; // Capture the Send wrapper, not its field.
                let _ = unsafe { buffer.0.Close() };
            });
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Started {
    capture_id: String,
    width: u32,
    height: u32,
}

#[derive(Default)]
pub struct StreamManager(Mutex<HashMap<String, Arc<Stream>>>);

fn shared_buffer(window: &WebviewWindow, id: &str, width: u32, height: u32) -> Result<(UiBuffer, Mapping), String> {
    let failed = || "O aplicativo não conseguiu preparar a imagem. Atualize o WebView2 e tente novamente.".to_string();
    let size = wire::VIDEO_HEADER + wire::VIDEO_SLOTS as usize * wire::video_slot_size(width, height);
    let meta = HSTRING::from(format!(r#"{{"vio":"video","captureId":"{id}"}}"#));
    let (sender, receiver) = mpsc::sync_channel(1);
    window
        .with_webview(move |webview| {
            let result = (|| -> windows::core::Result<(UiBuffer, Mapping)> {
                let environment: ICoreWebView2Environment12 = webview.environment().cast()?;
                let buffer = unsafe { environment.CreateSharedBuffer(size as u64) }?;
                let mut pointer = std::ptr::null_mut();
                unsafe { buffer.Buffer(&mut pointer) }?;
                let header = wire::video_header(width, height);
                unsafe { std::ptr::copy_nonoverlapping(header.as_ptr(), pointer, header.len()) };
                let core: ICoreWebView2_17 = unsafe { webview.controller().CoreWebView2() }?.cast()?;
                unsafe { core.PostSharedBufferToScript(&buffer, COREWEBVIEW2_SHARED_BUFFER_ACCESS_READ_ONLY, &meta) }?;
                Ok((UiBuffer(buffer), Mapping(pointer, size)))
            })();
            let _ = sender.send(result);
        })
        .map_err(|_| failed())?;
    receiver
        .recv_timeout(Duration::from_secs(5))
        .map_err(|_| failed())?
        .map_err(|_| failed())
}

impl StreamManager {
    /// Blocking: call from a worker thread, never from the UI thread.
    pub fn start(&self, window: &WebviewWindow, source_id: &str, mut options: Options) -> Result<Started, String> {
        if !matches!(options.fps, 15 | 30 | 60) {
            return Err("Escolha 15, 30 ou 60 quadros por segundo.".into());
        }
        if self.0.lock().map_err(|_| "A captura está indisponível.")?.len() >= MAX_STREAMS {
            return Err("Você já transmite 3 telas. Encerre uma para compartilhar outra.".into());
        }
        let app = window.app_handle().clone();
        let videos = app.state::<VideoManager>();
        let (source_width, source_height) = videos.size(source_id)?;
        (options.width, options.height) = wire::fit(
            source_width,
            source_height,
            options.width.clamp(2, MAX_WIDTH),
            options.height.clamp(2, MAX_HEIGHT),
        );
        let id = key()?;
        let (buffer, mapping) = shared_buffer(window, &id, options.width, options.height)?;
        let unavailable = || "Não foi possível iniciar a captura da imagem.".to_string();
        let frames = Arc::new(Frames {
            tick: Mutex::new(Tick::default()),
            changed: Condvar::new(),
            stopping: AtomicBool::new(false),
            closed: Arc::new(AtomicBool::new(false)),
            stop_event: Owned(unsafe { CreateEventW(None, true, false, None) }.map_err(|_| unavailable())?),
            frame_event: Owned(unsafe { CreateEventW(None, false, false, None) }.map_err(|_| unavailable())?),
        });
        let (ready, started) = mpsc::sync_channel(1);
        let worker_frames = frames.clone();
        let worker_app = app.clone();
        let source = source_id.to_string();
        let worker = std::thread::spawn(move || {
            let frames = worker_frames;
            let _apartment = Apartment::enter();
            borderless();
            let item = match worker_app.state::<VideoManager>().item(&source) {
                Ok(item) => item,
                Err(message) => {
                    frames.set(|t| t.state = 3);
                    let _ = ready.send(Err(message));
                    return;
                }
            };
            let failed = ready.clone();
            if run(&frames, item, options, mapping, ready).is_err() {
                frames.set(|t| t.state = 3);
                let _ = failed.send(Err("O Windows interrompeu a captura da imagem.".into()));
            } else {
                frames.set(|t| t.state = t.state.max(2));
            }
        });
        let stream = Arc::new(Stream {
            frames,
            worker: Mutex::new(Some(worker)),
            buffer: Mutex::new(Some(buffer)),
            waiting: AtomicBool::new(false),
        });
        match started.recv_timeout(Duration::from_secs(5)) {
            Ok(Ok(())) => {}
            failure => {
                stream.stop(&app);
                return Err(failure.ok().and_then(Result::err).unwrap_or_else(unavailable));
            }
        }
        self.0.lock().map_err(|_| unavailable())?.insert(id.clone(), stream);
        Ok(Started {
            capture_id: id,
            width: options.width,
            height: options.height,
        })
    }

    pub fn stream(&self, id: &str) -> Result<Arc<Stream>, String> {
        self.0
            .lock()
            .map_err(|_| "A captura está indisponível.")?
            .get(id)
            .cloned()
            .ok_or_else(|| "A captura já foi encerrada.".into())
    }

    /// Blocking (joins the worker): call from a worker thread. `None` stops all.
    pub fn stop(&self, app: &AppHandle, id: Option<&str>) {
        let streams: Vec<_> = match self.0.lock() {
            Ok(mut map) => match id {
                Some(id) => map.remove(id).into_iter().collect(),
                None => map.drain().map(|(_, s)| s).collect(),
            },
            Err(_) => Vec::new(),
        };
        for stream in streams {
            stream.stop(app);
        }
    }
}

#[cfg(test)]
mod bench {
    use super::*;
    use windows::Win32::{
        Foundation::{FILETIME, POINT},
        Graphics::Gdi::{MonitorFromPoint, MONITOR_DEFAULTTOPRIMARY},
        System::{
            Threading::{GetCurrentProcess, GetProcessTimes},
            WinRT::Graphics::Capture::IGraphicsCaptureItemInterop,
        },
    };

    fn cpu() -> Duration {
        let [mut a, mut b, mut kernel, mut user] = [FILETIME::default(); 4];
        unsafe {
            let _ = GetProcessTimes(GetCurrentProcess(), &mut a, &mut b, &mut kernel, &mut user);
        }
        let ticks = |t: FILETIME| ((t.dwHighDateTime as u64) << 32) | t.dwLowDateTime as u64;
        Duration::from_nanos((ticks(kernel) + ticks(user)) * 100)
    }

    /// Primary screen → NV12 1080p60 → shared memory for 10 s, without the WebView.
    /// `cargo test --release -- --ignored --nocapture native_capture_cpu`
    #[test]
    #[ignore]
    fn native_capture_cpu() {
        let _apartment = Apartment::enter();
        let monitor = unsafe { MonitorFromPoint(POINT::default(), MONITOR_DEFAULTTOPRIMARY) };
        let interop = windows::core::factory::<GraphicsCaptureItem, IGraphicsCaptureItemInterop>().unwrap();
        let item: GraphicsCaptureItem = unsafe { interop.CreateForMonitor(monitor) }.unwrap();
        let options = Options { width: 1920, height: 1080, fps: 60, cursor: true };
        let (width, height) = (options.width, options.height);
        let size = wire::VIDEO_HEADER + wire::VIDEO_SLOTS as usize * wire::video_slot_size(width, height);
        let mut memory = vec![0u8; size];
        let mapping = Mapping(memory.as_mut_ptr(), size);
        let frames = Arc::new(Frames {
            tick: Mutex::new(Tick::default()),
            changed: Condvar::new(),
            stopping: AtomicBool::new(false),
            closed: Arc::new(AtomicBool::new(false)),
            stop_event: Owned(unsafe { CreateEventW(None, true, false, None) }.unwrap()),
            frame_event: Owned(unsafe { CreateEventW(None, false, false, None) }.unwrap()),
        });
        // Fail with the stage and HRESULT: the runner may lack a video processor (WARP).
        let size = item.Size().expect("item size");
        let on_gpu = Pipeline::new(size, options).unwrap_or_else(|e| panic!("D3D11: {e:?}")).on_gpu();
        let worker_frames = frames.clone();
        let (ready, started) = mpsc::sync_channel(1);
        let worker = std::thread::spawn(move || {
            let _apartment = Apartment::enter();
            run(&worker_frames, item, options, mapping, ready).map_err(|e| format!("{e:?}"))
        });
        match started.recv_timeout(Duration::from_secs(5)) {
            Ok(Ok(())) => {}
            other => panic!("captura não iniciou: {other:?} / {:?}", worker.join()),
        }
        let (cpu0, wall0) = (cpu(), Instant::now());
        let mut samples = Vec::new();
        while wall0.elapsed() < Duration::from_secs(10) {
            std::thread::sleep(Duration::from_secs(1));
            samples.push(*frames.tick.lock().unwrap());
        }
        let (used, wall) = (cpu() - cpu0, wall0.elapsed());
        frames.stopping.store(true, Ordering::Release);
        unsafe {
            let _ = SetEvent(frames.stop_event.0);
        }
        worker.join().unwrap().unwrap();
        let cores = std::thread::available_parallelism().map_or(1, |n| n.get()) as f64;
        let share = used.as_secs_f64() / wall.as_secs_f64() * 100.0;
        let screen = item_size();
        println!(
            "VIO bench ({}): tela {}x{} -> {width}x{height}@60 | CPU {share:.1}% de um núcleo ({:.1}% do PC, {cores} núcleos) | quadros/s {:?} | ms/quadro {:?}",
            if on_gpu { "conversão na GPU" } else { "conversão na CPU" },
            screen.0,
            screen.1,
            share / cores,
            samples.iter().map(|t| t.fps).collect::<Vec<_>>(),
            samples.iter().map(|t| (t.busy_ms * 10.0).round() / 10.0).collect::<Vec<_>>(),
        );
        drop(memory);
    }

    fn item_size() -> (i32, i32) {
        let monitor = unsafe { MonitorFromPoint(POINT::default(), MONITOR_DEFAULTTOPRIMARY) };
        let interop = windows::core::factory::<GraphicsCaptureItem, IGraphicsCaptureItemInterop>().unwrap();
        let item: GraphicsCaptureItem = unsafe { interop.CreateForMonitor(monitor) }.unwrap();
        item.Size().map(|s| (s.Width, s.Height)).unwrap_or_default()
    }
}

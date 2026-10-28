// Native screen sources (#192): the app lists screens and windows itself and grabs one
// Windows.Graphics.Capture frame per thumbnail, so the WebView2 picker never opens.
// The page only sees opaque ids; handles and PIDs stay here.
use crate::{
    capture::{key, open_process, own_tree, process_started, LIST_COOLDOWN, LIST_VALID},
    wire,
};
use serde::Serialize;
use std::{
    collections::{HashMap, HashSet},
    sync::{Condvar, Mutex, Once},
    time::{Duration, Instant},
};
use windows::{
    core::{Interface, BOOL},
    Graphics::{
        Capture::{Direct3D11CaptureFramePool, GraphicsCaptureAccess, GraphicsCaptureAccessKind, GraphicsCaptureItem},
        DirectX::{Direct3D11::IDirect3DDevice, DirectXPixelFormat},
    },
    Win32::{
        Foundation::{HMODULE, HWND, LPARAM, RECT, WAIT_TIMEOUT},
        Graphics::{
            Direct3D::{D3D_DRIVER_TYPE_HARDWARE, D3D_DRIVER_TYPE_UNKNOWN},
            Direct3D11::{
                D3D11CreateDevice, ID3D11Device, ID3D11DeviceContext, ID3D11Texture2D, D3D11_CPU_ACCESS_READ,
                D3D11_CREATE_DEVICE_BGRA_SUPPORT, D3D11_MAP_READ, D3D11_MAPPED_SUBRESOURCE, D3D11_SDK_VERSION,
                D3D11_TEXTURE2D_DESC, D3D11_USAGE_STAGING,
            },
            Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS},
            Dxgi::{IDXGIAdapter, IDXGIDevice},
            Gdi::{
                CreateCompatibleBitmap, CreateCompatibleDC, CreateDIBSection, DeleteDC, DeleteObject, EnumDisplayMonitors, GdiFlush,
                GetDC, GetMonitorInfoW, ReleaseDC, SelectObject, SetBrushOrgEx, SetStretchBltMode, StretchBlt, BITMAPINFO,
                BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HALFTONE, HBITMAP, HDC, HGDIOBJ, HMONITOR, MONITORINFO, MONITORINFOEXW,
                SRCCOPY,
            },
        },
        Storage::Xps::{PrintWindow, PRINT_WINDOW_FLAGS},
        System::{
            Com::{CoInitializeEx, CoUninitialize, COINIT_MULTITHREADED},
            Threading::WaitForSingleObject,
            WinRT::{
                Direct3D11::{CreateDirect3D11DeviceFromDXGIDevice, IDirect3DDxgiInterfaceAccess},
                Graphics::Capture::IGraphicsCaptureItemInterop,
            },
        },
        UI::WindowsAndMessaging::{
            EnumWindows, GetClassNameW, GetWindow, GetWindowLongPtrW, GetWindowRect, GetWindowTextW,
            GetWindowThreadProcessId, IsHungAppWindow, IsIconic, IsWindow, IsWindowVisible, GWL_EXSTYLE, GWL_STYLE, GW_OWNER,
            MONITORINFOF_PRIMARY, WS_CHILD, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
        },
    },
};

const MAX_WINDOWS: usize = 128;
const FIRST_FRAME: Duration = Duration::from_millis(800);
/// Shell surfaces that pass the visibility checks but are never what someone shares.
const SHELL_CLASSES: [&str; 3] = ["Progman", "WorkerW", "Shell_TrayWnd"];

#[derive(Clone)]
enum Target {
    Screen { monitor: isize, device: [u16; 32] },
    Window { window: isize, pid: u32, started: u64 },
}

#[derive(Clone)]
struct NativeVideo {
    target: Target,
    title: String,
    width: u32,
    height: u32,
    primary: bool,
    minimized: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoSource {
    id: String,
    /// `screen` or `window`.
    kind: &'static str,
    title: String,
    width: u32,
    height: u32,
    primary: bool,
    /// Minimized windows deliver no frames, so they have no thumbnail.
    minimized: bool,
}

fn text(buffer: &[u16]) -> String {
    let end = buffer.iter().position(|&c| c == 0).unwrap_or(buffer.len());
    String::from_utf16_lossy(&buffer[..end])
}

fn monitor_info(monitor: HMONITOR) -> Option<MONITORINFOEXW> {
    let mut info = MONITORINFOEXW::default();
    info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
    unsafe { GetMonitorInfoW(monitor, &mut info as *mut MONITORINFOEXW as *mut MONITORINFO) }
        .as_bool()
        .then_some(info)
}

unsafe extern "system" fn visit_monitor(monitor: HMONITOR, _: HDC, _: *mut RECT, data: LPARAM) -> BOOL {
    let list = unsafe { &mut *(data.0 as *mut Vec<NativeVideo>) };
    if let Some(info) = monitor_info(monitor) {
        let rect = info.monitorInfo.rcMonitor;
        list.push(NativeVideo {
            target: Target::Screen {
                monitor: monitor.0 as isize,
                device: info.szDevice,
            },
            title: String::new(),
            width: (rect.right - rect.left).max(0) as u32,
            height: (rect.bottom - rect.top).max(0) as u32,
            primary: info.monitorInfo.dwFlags & MONITORINFOF_PRIMARY != 0,
            minimized: false,
        });
    }
    true.into()
}

fn screens() -> Vec<NativeVideo> {
    let mut list: Vec<NativeVideo> = Vec::new();
    unsafe {
        let _ = EnumDisplayMonitors(None, None, Some(visit_monitor), LPARAM(&mut list as *mut Vec<NativeVideo> as isize));
    }
    // Primary first, then left to right as Windows numbers them.
    list.sort_by_key(|s| !s.primary);
    let count = list.len();
    for (index, screen) in list.iter_mut().enumerate() {
        screen.title = match (count, screen.primary) {
            (1, _) => "Tela inteira".into(),
            (_, true) => format!("Tela {} (principal)", index + 1),
            _ => format!("Tela {}", index + 1),
        };
    }
    list
}

struct Windows {
    excluded: HashSet<u32>,
    found: Vec<NativeVideo>,
}

/// The same rules as Alt+Tab: visible, uncloaked, titled, top-level application windows.
unsafe extern "system" fn visit_window(window: HWND, data: LPARAM) -> BOOL {
    let list = unsafe { &mut *(data.0 as *mut Windows) };
    if list.found.len() >= MAX_WINDOWS {
        return false.into();
    }
    let style = unsafe { GetWindowLongPtrW(window, GWL_STYLE) } as u32;
    let extended = unsafe { GetWindowLongPtrW(window, GWL_EXSTYLE) } as u32;
    let owned = unsafe { GetWindow(window, GW_OWNER) }.is_ok_and(|owner| !owner.is_invalid());
    if !unsafe { IsWindowVisible(window) }.as_bool()
        || style & WS_CHILD.0 != 0
        || extended & WS_EX_TOOLWINDOW.0 != 0
        || (owned && extended & WS_EX_APPWINDOW.0 == 0)
    {
        return true.into();
    }
    // Cloaked windows (other desktops, suspended UWP, hidden helpers) render nothing.
    let mut cloaked = 0u32;
    let cloaked = unsafe {
        DwmGetWindowAttribute(window, DWMWA_CLOAKED, &mut cloaked as *mut u32 as *mut _, 4).is_ok() && cloaked != 0
    };
    if cloaked {
        return true.into();
    }
    let mut class = [0u16; 64];
    let length = unsafe { GetClassNameW(window, &mut class) };
    if SHELL_CLASSES.contains(&String::from_utf16_lossy(&class[..length.max(0) as usize]).as_str()) {
        return true.into();
    }
    let mut title = [0u16; 256];
    let length = unsafe { GetWindowTextW(window, &mut title) };
    let title = String::from_utf16_lossy(&title[..length.max(0) as usize]).trim().to_string();
    if title.is_empty() {
        return true.into();
    }
    let minimized = unsafe { IsIconic(window) }.as_bool();
    let mut rect = RECT::default();
    if unsafe { GetWindowRect(window, &mut rect) }.is_err() {
        return true.into();
    }
    let (width, height) = ((rect.right - rect.left).max(0) as u32, (rect.bottom - rect.top).max(0) as u32);
    if !minimized && (width < 2 || height < 2) {
        return true.into();
    }
    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(window, Some(&mut pid)) };
    if pid == 0 || list.excluded.contains(&pid) {
        return true.into();
    }
    let Some(process) = open_process(pid) else {
        return true.into();
    };
    let started = process_started(process.0);
    if started == 0 {
        return true.into();
    }
    list.found.push(NativeVideo {
        target: Target::Window {
            window: window.0 as isize,
            pid,
            started,
        },
        title,
        width,
        height,
        primary: false,
        minimized,
    });
    true.into()
}

fn windows() -> Vec<NativeVideo> {
    let mut list = Windows {
        excluded: own_tree(),
        found: Vec::new(),
    };
    unsafe {
        let _ = EnumWindows(Some(visit_window), LPARAM(&mut list as *mut Windows as isize));
    }
    list.found
}

impl NativeVideo {
    /// Re-checks that the handle still names the listed screen or window.
    fn item(&self) -> Result<GraphicsCaptureItem, String> {
        let gone = || "Esta janela ou tela não está mais disponível. Atualize a lista.".to_string();
        let interop = windows::core::factory::<GraphicsCaptureItem, IGraphicsCaptureItemInterop>().map_err(|_| gone())?;
        match &self.target {
            Target::Screen { monitor, device } => {
                let monitor = HMONITOR(*monitor as *mut _);
                if monitor_info(monitor).is_none_or(|info| text(&info.szDevice) != text(device)) {
                    return Err(gone());
                }
                unsafe { interop.CreateForMonitor(monitor) }.map_err(|_| gone())
            }
            Target::Window { .. } => {
                let window = self.window().ok_or_else(gone)?;
                unsafe { interop.CreateForWindow(window) }.map_err(|_| gone())
            }
        }
    }

    /// The listed window, if it still belongs to the same running process.
    fn window(&self) -> Option<HWND> {
        let Target::Window { window, pid, started } = &self.target else { return None };
        let window = HWND(*window as *mut _);
        let mut current = 0u32;
        unsafe { GetWindowThreadProcessId(window, Some(&mut current)) };
        let alive = open_process(*pid)
            .is_some_and(|p| process_started(p.0) == *started && unsafe { WaitForSingleObject(p.0, 0) } == WAIT_TIMEOUT);
        (unsafe { IsWindow(Some(window)) }.as_bool() && current == *pid && alive).then_some(window)
    }
}

/// MTA for the current blocking thread; undone only if this call set it.
pub(crate) struct Apartment(bool);
impl Apartment {
    pub fn enter() -> Self {
        Self(unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) }.is_ok())
    }
}
impl Drop for Apartment {
    fn drop(&mut self) {
        if self.0 {
            unsafe { CoUninitialize() };
        }
    }
}

pub(crate) struct Gpu {
    pub device: ID3D11Device,
    pub context: ID3D11DeviceContext,
    pub winrt: IDirect3DDevice,
}

impl Gpu {
    pub fn new() -> windows::core::Result<Self> {
        Self::on(None)
    }

    /// A device on `adapter`, or on the default GPU.
    pub fn on(adapter: Option<&IDXGIAdapter>) -> windows::core::Result<Self> {
        let (mut device, mut context) = (None, None);
        unsafe {
            D3D11CreateDevice(
                adapter,
                if adapter.is_some() { D3D_DRIVER_TYPE_UNKNOWN } else { D3D_DRIVER_TYPE_HARDWARE },
                HMODULE::default(),
                D3D11_CREATE_DEVICE_BGRA_SUPPORT,
                None,
                D3D11_SDK_VERSION,
                Some(&mut device),
                None,
                Some(&mut context),
            )?;
        }
        let device: ID3D11Device = device.ok_or(windows::core::Error::empty())?;
        let context = context.ok_or(windows::core::Error::empty())?;
        let winrt = unsafe { CreateDirect3D11DeviceFromDXGIDevice(&device.cast::<IDXGIDevice>()?) }?.cast()?;
        Ok(Self { device, context, winrt })
    }
}

/// Windows 11 lets an unpackaged app drop the yellow capture border; older builds keep it.
pub(crate) fn borderless() {
    static ASKED: Once = Once::new();
    ASKED.call_once(|| {
        if let Ok(operation) = GraphicsCaptureAccess::RequestAccessAsync(GraphicsCaptureAccessKind::Borderless) {
            let _ = operation.join();
        }
    });
}

/// One frame of `item`, scaled down to the picker thumbnail.
fn snapshot(gpu: &Gpu, item: &GraphicsCaptureItem) -> windows::core::Result<Vec<u8>> {
    let pool = Direct3D11CaptureFramePool::CreateFreeThreaded(
        &gpu.winrt,
        DirectXPixelFormat::B8G8R8A8UIntNormalized,
        1,
        item.Size()?,
    )?;
    let session = pool.CreateCaptureSession(item)?;
    let _ = session.SetIsCursorCaptureEnabled(false);
    let _ = session.SetIsBorderRequired(false);
    session.StartCapture()?;
    let deadline = Instant::now() + FIRST_FRAME;
    let frame = loop {
        match pool.TryGetNextFrame() {
            Ok(frame) => break Ok(frame),
            Err(_) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(8)),
            Err(e) => break Err(e),
        }
    };
    let result = frame.and_then(|frame| {
        let size = frame.ContentSize()?;
        let access: IDirect3DDxgiInterfaceAccess = frame.Surface()?.cast()?;
        let texture: ID3D11Texture2D = unsafe { access.GetInterface() }?;
        let mut desc = D3D11_TEXTURE2D_DESC::default();
        unsafe { texture.GetDesc(&mut desc) };
        desc.Usage = D3D11_USAGE_STAGING;
        desc.BindFlags = 0;
        desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ.0 as u32;
        desc.MiscFlags = 0;
        let mut staging = None;
        unsafe { gpu.device.CreateTexture2D(&desc, None, Some(&mut staging)) }?;
        let staging = staging.ok_or(windows::core::Error::empty())?;
        unsafe { gpu.context.CopyResource(&staging, &texture) };
        let _ = frame.Close();
        let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
        unsafe { gpu.context.Map(&staging, 0, D3D11_MAP_READ, 0, Some(&mut mapped)) }?;
        let width = (size.Width.max(1) as u32).min(desc.Width);
        let height = (size.Height.max(1) as u32).min(desc.Height);
        let pixels = unsafe { std::slice::from_raw_parts(mapped.pData as *const u8, (mapped.RowPitch * desc.Height) as usize) };
        let bytes = wire::thumbnail(pixels, width, height, mapped.RowPitch);
        unsafe { gpu.context.Unmap(&staging, 0) };
        Ok(bytes)
    });
    let _ = session.Close();
    let _ = pool.Close();
    result
}

/// GDI device context and bitmap of one thumbnail, released on drop.
struct Canvas {
    dc: HDC,
    bitmap: HBITMAP,
    previous: HGDIOBJ,
}

impl Canvas {
    fn new(screen: HDC, bitmap: HBITMAP) -> Option<Self> {
        if bitmap.is_invalid() {
            return None;
        }
        let dc = unsafe { CreateCompatibleDC(Some(screen)) };
        if dc.is_invalid() {
            unsafe {
                let _ = DeleteObject(bitmap.into());
            }
            return None;
        }
        let previous = unsafe { SelectObject(dc, bitmap.into()) };
        Some(Self { dc, bitmap, previous })
    }
}

impl Drop for Canvas {
    fn drop(&mut self) {
        unsafe {
            SelectObject(self.dc, self.previous);
            let _ = DeleteDC(self.dc);
            let _ = DeleteObject(self.bitmap.into());
        }
    }
}

/// Thumbnail through GDI (#247): no capture session, so no yellow border on Windows 10
/// and no GPU device per source, cheap enough for three at a time. Screens are scaled
/// from the desktop; windows draw themselves with PrintWindow (PW_RENDERFULLCONTENT
/// covers GPU-drawn browsers). `None` when GDI sees only black (protected or exclusive
/// fullscreen content): WGC tries then.
fn gdi_thumbnail(source: &NativeVideo) -> Option<Vec<u8>> {
    let screen = unsafe { GetDC(None) };
    if screen.is_invalid() {
        return None;
    }
    let result = (|| {
        let mut window_canvas = None;
        let (from, area) = match &source.target {
            Target::Screen { monitor, .. } => (screen, monitor_info(HMONITOR(*monitor as *mut _))?.monitorInfo.rcMonitor),
            Target::Window { window, .. } => {
                let window = HWND(*window as *mut _);
                // PrintWindow waits on the window's thread; a hung one would hold a slot.
                if unsafe { IsHungAppWindow(window) }.as_bool() {
                    return None;
                }
                let mut outer = RECT::default();
                unsafe { GetWindowRect(window, &mut outer) }.ok()?;
                // The visible frame, without the invisible resize borders around it.
                let mut frame = outer;
                let _ = unsafe {
                    DwmGetWindowAttribute(
                        window,
                        DWMWA_EXTENDED_FRAME_BOUNDS,
                        &mut frame as *mut RECT as *mut _,
                        std::mem::size_of::<RECT>() as u32,
                    )
                };
                let (width, height) = (outer.right - outer.left, outer.bottom - outer.top);
                if width < 2 || height < 2 {
                    return None;
                }
                let canvas = Canvas::new(screen, unsafe { CreateCompatibleBitmap(screen, width, height) })?;
                if !unsafe { PrintWindow(window, canvas.dc, PRINT_WINDOW_FLAGS(PW_RENDERFULLCONTENT)) }.as_bool() {
                    return None;
                }
                let dc = canvas.dc;
                window_canvas = Some(canvas);
                let area = RECT {
                    left: frame.left - outer.left,
                    top: frame.top - outer.top,
                    right: frame.right - outer.left,
                    bottom: frame.bottom - outer.top,
                };
                (dc, area)
            }
        };
        let (width, height) = (area.right - area.left, area.bottom - area.top);
        if width < 1 || height < 1 {
            return None;
        }
        let (w, h) = wire::thumb_size(width as u32, height as u32);
        let info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: w as i32,
                biHeight: -(h as i32),
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };
        let mut bits = std::ptr::null_mut();
        let dib = unsafe { CreateDIBSection(Some(screen), &info, DIB_RGB_COLORS, &mut bits, None, 0) }.ok()?;
        let out = Canvas::new(screen, dib)?;
        let copied = unsafe {
            SetStretchBltMode(out.dc, HALFTONE);
            let _ = SetBrushOrgEx(out.dc, 0, 0, None);
            let copied = StretchBlt(out.dc, 0, 0, w as i32, h as i32, Some(from), area.left, area.top, width, height, SRCCOPY).as_bool();
            let _ = GdiFlush();
            copied
        };
        drop(window_canvas);
        if !copied || bits.is_null() {
            return None;
        }
        let pixels = unsafe { std::slice::from_raw_parts(bits as *const u8, (w * h * 4) as usize) };
        if pixels.chunks_exact(4).all(|p| p[0] | p[1] | p[2] == 0) {
            return None;
        }
        Some(wire::thumbnail(pixels, w, h, w * 4))
    })();
    unsafe { ReleaseDC(None, screen) };
    result
}

/// The listed screen or window a thumbnail belongs to, across listings.
fn handle(target: &Target) -> isize {
    match target {
        Target::Screen { monitor, .. } => *monitor,
        Target::Window { window, .. } => *window,
    }
}

/// Win32 PW_RENDERFULLCONTENT (Windows 8.1+), missing from the bindings.
const PW_RENDERFULLCONTENT: u32 = 2;
const THUMB_FRESH: Duration = Duration::from_secs(4);
const THUMB_PARALLEL: u32 = 3;

/// The WGC fallback's device, kept between thumbnails. D3D11 devices are free-threaded;
/// the immediate context is only used under `VideoManager::busy`.
struct SharedGpu(Gpu);
unsafe impl Send for SharedGpu {}

#[derive(Default)]
struct Inner {
    sources: HashMap<String, NativeVideo>,
    listed: Option<Instant>,
}

#[derive(Default)]
pub struct VideoManager {
    inner: Mutex<Inner>,
    /// One WGC thumbnail at a time keeps a picker refresh from flooding the GPU.
    busy: Mutex<Option<SharedGpu>>,
    /// GDI thumbnails running now (up to `THUMB_PARALLEL`).
    running: (Mutex<u32>, Condvar),
    /// Recent thumbnails by screen or window: reopening the picker shows them at once.
    recent: Mutex<HashMap<isize, (Instant, Vec<u8>)>>,
}

impl VideoManager {
    pub fn sources(&self) -> Result<Vec<VideoSource>, String> {
        let mut inner = self.inner.lock().map_err(|_| "A captura está indisponível.")?;
        if inner.listed.is_some_and(|t| t.elapsed() < LIST_COOLDOWN) {
            return Err("Aguarde um instante antes de atualizar a lista.".into());
        }
        inner.sources.clear();
        inner.listed = Some(Instant::now());
        let mut found = windows();
        found.sort_by_key(|s| s.title.to_lowercase());
        let mut list = Vec::new();
        for entry in screens().into_iter().chain(found) {
            let id = key()?;
            list.push(VideoSource {
                id: id.clone(),
                kind: match entry.target {
                    Target::Screen { .. } => "screen",
                    Target::Window { .. } => "window",
                },
                title: entry.title.clone(),
                width: entry.width,
                height: entry.height,
                primary: entry.primary,
                minimized: entry.minimized,
            });
            inner.sources.insert(id, entry);
        }
        Ok(list)
    }

    fn source(&self, id: &str) -> Result<NativeVideo, String> {
        let inner = self.inner.lock().map_err(|_| "A captura está indisponível.")?;
        if !inner.listed.is_some_and(|t| t.elapsed() < LIST_VALID) {
            return Err("Atualize a lista e escolha novamente.".into());
        }
        inner
            .sources
            .get(id)
            .cloned()
            .ok_or_else(|| "Escolha uma tela ou janela da lista atual.".into())
    }

    /// Listed size of a source, for picking the output resolution.
    pub fn size(&self, id: &str) -> Result<(u32, u32), String> {
        let source = self.source(id)?;
        Ok((source.width, source.height))
    }

    /// The window, PID, process start and title behind a window source, for its audio.
    pub fn audio_target(&self, id: &str) -> Result<(isize, u32, u64, String), String> {
        let source = self.source(id)?;
        match source.target {
            Target::Window { window, pid, started } => Ok((window, pid, started, source.title)),
            Target::Screen { .. } => Err("Uma tela não tem o som de um só aplicativo.".into()),
        }
    }

    /// The monitor behind a screen source, still showing the listed device; `None` for a window.
    pub fn monitor(&self, id: &str) -> Result<Option<HMONITOR>, String> {
        match self.source(id)?.target {
            Target::Screen { monitor, device } => {
                let monitor = HMONITOR(monitor as *mut _);
                if monitor_info(monitor).is_none_or(|info| text(&info.szDevice) != text(&device)) {
                    return Err("Esta tela não está mais disponível. Atualize a lista.".into());
                }
                Ok(Some(monitor))
            }
            Target::Window { .. } => Ok(None),
        }
    }

    /// A window source GDI can draw (#247): Windows 10 windows go through PrintWindow,
    /// since WGC there always draws the yellow border. `None` sends it to WGC: a screen,
    /// Windows 11, or a window GDI sees as black (protected or exclusive fullscreen).
    pub fn gdi_window(&self, id: &str) -> Result<Option<HWND>, String> {
        let source = self.source(id)?;
        if !matches!(source.target, Target::Window { .. }) || !crate::duplication::wanted() {
            return Ok(None);
        }
        let window = source.window().ok_or("Esta janela não está mais disponível. Atualize a lista.")?;
        // A minimized window has nothing to test yet; it starts drawing once restored.
        Ok((source.minimized || self.gdi(&source).is_some()).then_some(window))
    }

    /// The capture item of a listed source; call inside an MTA [`Apartment`].
    pub fn item(&self, id: &str) -> Result<GraphicsCaptureItem, String> {
        self.source(id)?.item()
    }

    /// Blocking: call from a worker thread. GDI first, WGC only when GDI sees black.
    pub fn thumbnail(&self, id: &str) -> Result<Vec<u8>, String> {
        let source = self.source(id)?;
        if source.minimized {
            return Err("Janelas minimizadas não têm miniatura.".into());
        }
        let key = handle(&source.target);
        if let Some((_, bytes)) = self.recent.lock().ok().and_then(|r| r.get(&key).filter(|(at, _)| at.elapsed() < THUMB_FRESH).cloned()) {
            return Ok(bytes);
        }
        let bytes = match self.gdi(&source) {
            Some(bytes) => bytes,
            None => self.wgc(&source)?,
        };
        if let Ok(mut recent) = self.recent.lock() {
            recent.retain(|_, (at, _)| at.elapsed() < THUMB_FRESH);
            recent.insert(key, (Instant::now(), bytes.clone()));
        }
        Ok(bytes)
    }

    fn gdi(&self, source: &NativeVideo) -> Option<Vec<u8>> {
        let (count, freed) = &self.running;
        {
            let mut running = count.lock().ok()?;
            while *running >= THUMB_PARALLEL {
                running = freed.wait(running).ok()?;
            }
            *running += 1;
        }
        struct Slot<'a>(&'a (Mutex<u32>, Condvar));
        impl Drop for Slot<'_> {
            fn drop(&mut self) {
                if let Ok(mut running) = self.0 .0.lock() {
                    *running -= 1;
                }
                self.0 .1.notify_one();
            }
        }
        let _slot = Slot(&self.running);
        gdi_thumbnail(source)
    }

    fn wgc(&self, source: &NativeVideo) -> Result<Vec<u8>, String> {
        let failed = || "O Windows não liberou a imagem desta janela.".to_string();
        let mut gpu = self.busy.lock().map_err(|_| "A captura está indisponível.")?;
        let _apartment = Apartment::enter();
        borderless();
        let item = source.item()?;
        if gpu.is_none() {
            *gpu = Some(SharedGpu(Gpu::new().map_err(|_| failed())?));
        }
        let Some(SharedGpu(device)) = gpu.as_ref() else { return Err(failed()) };
        snapshot(device, &item).map_err(|_| {
            // A lost device (driver update, GPU reset) is made again next time.
            *gpu = None;
            failed()
        })
    }
}

#[cfg(test)]
mod bench {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    /// #247: every listed source's thumbnail, the old way (WGC, one at a time) and the
    /// new one (GDI, three at a time, WGC only for black results).
    /// `cargo test --release -- --ignored --nocapture thumbnails_speed`
    #[test]
    #[ignore]
    fn thumbnails_speed() {
        let manager = VideoManager::default();
        let listed = Instant::now();
        let list = manager.sources().expect("lista");
        let listing = listed.elapsed();
        let sources: Vec<NativeVideo> = list.iter().filter(|s| !s.minimized).map(|s| manager.source(&s.id).unwrap()).collect();
        let started = Instant::now();
        let before = sources.iter().filter(|s| manager.wgc(s).is_ok()).count();
        let wgc = started.elapsed();
        let (next, ready, fallback) = (AtomicUsize::new(0), AtomicUsize::new(0), AtomicUsize::new(0));
        let started = Instant::now();
        std::thread::scope(|scope| {
            for _ in 0..THUMB_PARALLEL {
                scope.spawn(|| {
                    while let Some(source) = sources.get(next.fetch_add(1, Ordering::Relaxed)) {
                        let bytes = manager.gdi(source).or_else(|| {
                            fallback.fetch_add(1, Ordering::Relaxed);
                            manager.wgc(source).ok()
                        });
                        if bytes.is_some() {
                            ready.fetch_add(1, Ordering::Relaxed);
                        }
                    }
                });
            }
        });
        let gdi = started.elapsed();
        println!(
            "VIO miniaturas: {} fontes, lista em {} ms | antes (WGC, uma a uma): {} ms, {before} prontas | agora (GDI, 3 em paralelo): {} ms, {} prontas, {} pela reserva WGC",
            sources.len(),
            listing.as_millis(),
            wgc.as_millis(),
            gdi.as_millis(),
            ready.load(Ordering::Relaxed),
            fallback.load(Ordering::Relaxed),
        );
    }
}

// Windows 10 screens without the yellow border (#247). Windows.Graphics.Capture always
// draws it there; DXGI Desktop Duplication hands over the monitor image with no border.
// Windows 11 and every window keep WGC, which goes borderless on 11. Same NV12 pipeline,
// same shared buffer: the page cannot tell the two apart.
use crate::{
    capture::windows_build,
    stream::{Frames, Mapping, Options, Pipeline, Writer},
    video::Gpu,
};
use std::{
    sync::mpsc,
    time::{Duration, Instant},
};
use windows::{
    core::{Interface, Result},
    Graphics::SizeInt32,
    Win32::{
        Foundation::POINT,
        Graphics::{
            Direct3D11::{
                ID3D11Texture2D, D3D11_BIND_RENDER_TARGET, D3D11_BIND_SHADER_RESOURCE, D3D11_RESOURCE_MISC_GDI_COMPATIBLE,
                D3D11_TEXTURE2D_DESC, D3D11_USAGE_DEFAULT,
            },
            Dxgi::{
                Common::{DXGI_FORMAT, DXGI_FORMAT_B8G8R8A8_UNORM, DXGI_MODE_ROTATION_IDENTITY, DXGI_MODE_ROTATION_UNSPECIFIED, DXGI_SAMPLE_DESC},
                CreateDXGIFactory1, IDXGIFactory1, IDXGIOutput1, IDXGIOutputDuplication, IDXGISurface1, DXGI_ERROR_ACCESS_LOST,
                DXGI_ERROR_NOT_FOUND, DXGI_ERROR_WAIT_TIMEOUT, DXGI_OUTDUPL_FRAME_INFO,
            },
            Gdi::{DeleteObject, HDC, HMONITOR},
        },
        UI::WindowsAndMessaging::{DrawIconEx, GetCursorInfo, GetIconInfo, CURSORINFO, CURSOR_SHOWING, DI_NORMAL, HICON, ICONINFO},
    },
};

/// Borderless WGC exists from build 20348 (Windows 11, Server 2022).
pub fn wanted() -> bool {
    windows_build() < 20348
}

pub(crate) struct Duplicator {
    output: IDXGIOutput1,
    duplication: IDXGIOutputDuplication,
    pipeline: Pipeline,
    /// Monitor top-left on the virtual desktop, for the cursor.
    origin: POINT,
}

/// Desktop image (clean) and the copy the cursor is drawn on, at the monitor's size.
struct Surfaces {
    desktop: ID3D11Texture2D,
    canvas: Option<ID3D11Texture2D>,
    width: u32,
    height: u32,
    format: DXGI_FORMAT,
}

pub(crate) fn texture(pipeline: &Pipeline, width: u32, height: u32, format: DXGI_FORMAT, gdi: bool) -> Result<ID3D11Texture2D> {
    let desc = D3D11_TEXTURE2D_DESC {
        Width: width,
        Height: height,
        MipLevels: 1,
        ArraySize: 1,
        Format: format,
        SampleDesc: DXGI_SAMPLE_DESC { Count: 1, Quality: 0 },
        Usage: D3D11_USAGE_DEFAULT,
        BindFlags: (D3D11_BIND_RENDER_TARGET.0 | D3D11_BIND_SHADER_RESOURCE.0) as u32,
        CPUAccessFlags: 0,
        MiscFlags: if gdi { D3D11_RESOURCE_MISC_GDI_COMPATIBLE.0 as u32 } else { 0 },
    };
    let mut texture = None;
    unsafe { pipeline.gpu.device.CreateTexture2D(&desc, None, Some(&mut texture)) }?;
    texture.ok_or(windows::core::Error::empty())
}

/// Draws the current pointer with GDI; Desktop Duplication leaves it out of the image.
fn draw_cursor(canvas: &ID3D11Texture2D, origin: POINT) -> Result<()> {
    let surface: IDXGISurface1 = canvas.cast()?;
    let dc = unsafe { surface.GetDC(false) }?;
    cursor(dc, origin);
    unsafe { surface.ReleaseDC(None) }
}

/// The pointer on `dc`, whose top-left sits at `origin` on the virtual desktop.
pub(crate) fn cursor(dc: HDC, origin: POINT) {
    let mut info = CURSORINFO {
        cbSize: std::mem::size_of::<CURSORINFO>() as u32,
        ..Default::default()
    };
    if unsafe { GetCursorInfo(&mut info) }.is_ok() && info.flags.0 & CURSOR_SHOWING.0 != 0 && !info.hCursor.is_invalid() {
        let icon = HICON(info.hCursor.0);
        let mut details = ICONINFO::default();
        let (mut hot_x, mut hot_y) = (0, 0);
        if unsafe { GetIconInfo(icon, &mut details) }.is_ok() {
            (hot_x, hot_y) = (details.xHotspot as i32, details.yHotspot as i32);
            unsafe {
                let _ = DeleteObject(details.hbmMask.into());
                if !details.hbmColor.is_invalid() {
                    let _ = DeleteObject(details.hbmColor.into());
                }
            }
        }
        let (x, y) = (info.ptScreenPos.x - origin.x - hot_x, info.ptScreenPos.y - origin.y - hot_y);
        unsafe {
            let _ = DrawIconEx(dc, x, y, icon, 0, 0, 0, None, DI_NORMAL);
        }
    }
}

impl Duplicator {
    /// Finds the GPU output that shows `monitor` and starts duplicating it there.
    pub fn open(monitor: HMONITOR, options: Options) -> Result<Self> {
        let factory: IDXGIFactory1 = unsafe { CreateDXGIFactory1() }?;
        let mut a = 0;
        while let Ok(adapter) = unsafe { factory.EnumAdapters1(a) } {
            a += 1;
            let mut o = 0;
            while let Ok(output) = unsafe { adapter.EnumOutputs(o) } {
                o += 1;
                let desc = unsafe { output.GetDesc() }?;
                if desc.Monitor != monitor {
                    continue;
                }
                // A rotated screen arrives sideways; WGC rotates it, so it keeps those.
                if desc.Rotation != DXGI_MODE_ROTATION_IDENTITY && desc.Rotation != DXGI_MODE_ROTATION_UNSPECIFIED {
                    return Err(DXGI_ERROR_NOT_FOUND.into());
                }
                let rect = desc.DesktopCoordinates;
                let size = SizeInt32 {
                    Width: rect.right - rect.left,
                    Height: rect.bottom - rect.top,
                };
                let gpu = Gpu::on(Some(&adapter.cast()?))?;
                let output: IDXGIOutput1 = output.cast()?;
                let duplication = unsafe { output.DuplicateOutput(&gpu.device) }?;
                return Ok(Self {
                    output,
                    duplication,
                    pipeline: Pipeline::on(gpu, size, options)?,
                    origin: POINT { x: rect.left, y: rect.top },
                });
            }
        }
        Err(DXGI_ERROR_NOT_FOUND.into())
    }

    /// After a mode change, a desktop switch (UAC, lock screen) or a fullscreen game.
    fn reopen(&mut self, frames: &Frames) -> Result<()> {
        let deadline = Instant::now() + Duration::from_secs(10);
        loop {
            match unsafe { self.output.DuplicateOutput(&self.pipeline.gpu.device) } {
                Ok(duplication) => {
                    self.duplication = duplication;
                    let rect = unsafe { self.output.GetDesc() }?.DesktopCoordinates;
                    self.origin = POINT { x: rect.left, y: rect.top };
                    return Ok(());
                }
                Err(e) if Instant::now() > deadline || frames.stopping() => return Err(e),
                Err(_) => std::thread::sleep(Duration::from_millis(100)),
            }
        }
    }

    pub fn run(mut self, frames: &Frames, options: Options, mapping: Mapping, ready: mpsc::SyncSender<std::result::Result<(), String>>) -> Result<()> {
        frames.running(self.pipeline.on_gpu());
        let _ = ready.send(Ok(()));
        let mut writer = Writer::new(mapping, options);
        let wait = (1000 / options.fps).max(1);
        let epoch = Instant::now();
        let mut surfaces: Option<Surfaces> = None;
        let mut dirty = false;
        while !frames.stopping() {
            let mut info = DXGI_OUTDUPL_FRAME_INFO::default();
            let mut resource = None;
            match unsafe { self.duplication.AcquireNextFrame(wait, &mut info, &mut resource) } {
                Ok(()) => {
                    let copied = (|| -> Result<()> {
                        if info.LastPresentTime == 0 {
                            dirty |= options.cursor && info.LastMouseUpdateTime != 0;
                            return Ok(());
                        }
                        let Some(resource) = resource else { return Ok(()) };
                        let frame: ID3D11Texture2D = resource.cast()?;
                        let mut desc = D3D11_TEXTURE2D_DESC::default();
                        unsafe { frame.GetDesc(&mut desc) };
                        if !surfaces.as_ref().is_some_and(|s| (s.width, s.height, s.format) == (desc.Width, desc.Height, desc.Format)) {
                            let gdi = options.cursor && desc.Format == DXGI_FORMAT_B8G8R8A8_UNORM;
                            surfaces = Some(Surfaces {
                                desktop: texture(&self.pipeline, desc.Width, desc.Height, desc.Format, false)?,
                                canvas: gdi.then(|| texture(&self.pipeline, desc.Width, desc.Height, desc.Format, true)).transpose()?,
                                width: desc.Width,
                                height: desc.Height,
                                format: desc.Format,
                            });
                            self.pipeline.resize(SizeInt32 {
                                Width: desc.Width as i32,
                                Height: desc.Height as i32,
                            })?;
                        }
                        if let Some(s) = &surfaces {
                            unsafe { self.pipeline.gpu.context.CopyResource(&s.desktop, &frame) };
                            dirty = true;
                        }
                        Ok(())
                    })();
                    let _ = unsafe { self.duplication.ReleaseFrame() };
                    copied?;
                }
                Err(e) if e.code() == DXGI_ERROR_WAIT_TIMEOUT => {}
                Err(e) if e.code() == DXGI_ERROR_ACCESS_LOST => {
                    self.reopen(frames)?;
                    continue;
                }
                Err(e) => return Err(e),
            }
            // A frame too early for the rate waits for the next pass instead of being lost.
            let Some(s) = surfaces.as_ref().filter(|_| dirty) else { continue };
            if !writer.due() {
                continue;
            }
            dirty = false;
            let started = Instant::now();
            let source = match &s.canvas {
                Some(canvas) => {
                    unsafe { self.pipeline.gpu.context.CopyResource(canvas, &s.desktop) };
                    let _ = draw_cursor(canvas, self.origin);
                    canvas
                }
                None => &s.desktop,
            };
            let content = SizeInt32 {
                Width: s.width as i32,
                Height: s.height as i32,
            };
            writer.write(frames, &mut self.pipeline, source, content, epoch.elapsed().as_micros() as u64)?;
            writer.count(frames, started);
        }
        Ok(())
    }
}

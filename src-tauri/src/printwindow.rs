// Windows 10 windows without the yellow border (#247). WGC there always draws it and
// Desktop Duplication would show whatever covers the window, so the window draws itself
// with PrintWindow (PW_RENDERFULLCONTENT covers GPU-drawn browsers) straight into a
// GDI-compatible texture; from there it takes the same NV12 pipeline as the other paths.
use crate::{
    duplication::{cursor, texture},
    stream::{Frames, Mapping, Options, Pipeline, Writer},
};
use std::{
    sync::mpsc,
    time::{Duration, Instant},
};
use windows::{
    core::{Interface, Result},
    Graphics::SizeInt32,
    Win32::{
        Foundation::{HWND, POINT, RECT},
        Graphics::{
            Direct3D11::{ID3D11Texture2D, D3D11_BOX},
            Dwm::{DwmGetWindowAttribute, DWMWA_EXTENDED_FRAME_BOUNDS},
            Dxgi::{Common::DXGI_FORMAT_B8G8R8A8_UNORM, IDXGISurface1},
        },
        Storage::Xps::{PrintWindow, PRINT_WINDOW_FLAGS},
        UI::WindowsAndMessaging::{GetCursorPos, GetWindowRect, IsHungAppWindow, IsIconic, IsWindow},
    },
};

/// Win32 PW_RENDERFULLCONTENT (Windows 8.1+), missing from the bindings.
const PW_RENDERFULLCONTENT: u32 = 2;
/// How often a minimized or hung window is looked at again.
const IDLE: Duration = Duration::from_millis(100);

/// The whole window (what PrintWindow draws) and its visible frame inside it.
fn bounds(window: HWND) -> Option<(RECT, RECT)> {
    let mut outer = RECT::default();
    unsafe { GetWindowRect(window, &mut outer) }.ok()?;
    let mut frame = outer;
    let _ = unsafe {
        DwmGetWindowAttribute(
            window,
            DWMWA_EXTENDED_FRAME_BOUNDS,
            &mut frame as *mut RECT as *mut _,
            std::mem::size_of::<RECT>() as u32,
        )
    };
    // Without the invisible resize borders, and never outside what PrintWindow draws.
    let frame = RECT {
        left: frame.left.max(outer.left),
        top: frame.top.max(outer.top),
        right: frame.right.min(outer.right),
        bottom: frame.bottom.min(outer.bottom),
    };
    (frame.right - frame.left >= 2 && frame.bottom - frame.top >= 2).then_some((outer, frame))
}

/// The drawn window and the cropped copy the pipeline reads, for one window size.
struct Surfaces {
    drawn: ID3D11Texture2D,
    cropped: ID3D11Texture2D,
    outer: (i32, i32),
    frame: (i32, i32),
}

pub(crate) struct WindowCopier {
    window: HWND,
    pipeline: Pipeline,
}

// The window handle is only used from the capture thread.
unsafe impl Send for WindowCopier {}

impl WindowCopier {
    pub fn open(window: HWND, options: Options) -> Result<Self> {
        // A minimized window starts at the output size and is resized once restored.
        let size = bounds(window)
            .filter(|_| !unsafe { IsIconic(window) }.as_bool())
            .map_or(SizeInt32 { Width: options.width as i32, Height: options.height as i32 }, |(_, f)| SizeInt32 {
                Width: f.right - f.left,
                Height: f.bottom - f.top,
            });
        Ok(Self {
            window,
            pipeline: Pipeline::new(size, options)?,
        })
    }

    pub fn run(mut self, frames: &Frames, options: Options, mapping: Mapping, ready: mpsc::SyncSender<std::result::Result<(), String>>) -> Result<()> {
        frames.running(self.pipeline.on_gpu());
        let _ = ready.send(Ok(()));
        let mut writer = Writer::new(mapping, options);
        let epoch = Instant::now();
        let mut surfaces: Option<Surfaces> = None;
        while !frames.stopping() {
            frames.sleep(writer.wait());
            if frames.stopping() {
                break;
            }
            // A closed window ends the share, like WGC's Closed.
            if !unsafe { IsWindow(Some(self.window)) }.as_bool() {
                break;
            }
            // Minimized: the last frame stays. Hung: PrintWindow would block on its thread.
            if unsafe { IsIconic(self.window) }.as_bool() || unsafe { IsHungAppWindow(self.window) }.as_bool() {
                frames.sleep(IDLE);
                continue;
            }
            let Some((outer, frame)) = bounds(self.window) else {
                frames.sleep(IDLE);
                continue;
            };
            if !writer.due() {
                continue;
            }
            let started = Instant::now();
            let size = ((outer.right - outer.left, outer.bottom - outer.top), (frame.right - frame.left, frame.bottom - frame.top));
            if !surfaces.as_ref().is_some_and(|s| (s.outer, s.frame) == size) {
                let ((ow, oh), (fw, fh)) = size;
                surfaces = Some(Surfaces {
                    drawn: texture(&self.pipeline, ow as u32, oh as u32, DXGI_FORMAT_B8G8R8A8_UNORM, true)?,
                    cropped: texture(&self.pipeline, fw as u32, fh as u32, DXGI_FORMAT_B8G8R8A8_UNORM, false)?,
                    outer: (ow, oh),
                    frame: (fw, fh),
                });
                self.pipeline.resize(SizeInt32 { Width: fw, Height: fh })?;
            }
            let Some(s) = &surfaces else { continue };
            let surface: IDXGISurface1 = s.drawn.cast()?;
            let dc = unsafe { surface.GetDC(true) }?;
            let drawn = unsafe { PrintWindow(self.window, dc, PRINT_WINDOW_FLAGS(PW_RENDERFULLCONTENT)) }.as_bool();
            if drawn && options.cursor {
                let mut point = POINT::default();
                let inside = unsafe { GetCursorPos(&mut point) }.is_ok()
                    && (frame.left..frame.right).contains(&point.x)
                    && (frame.top..frame.bottom).contains(&point.y);
                if inside {
                    cursor(dc, POINT { x: outer.left, y: outer.top });
                }
            }
            unsafe { surface.ReleaseDC(None) }?;
            if !drawn {
                continue;
            }
            let area = D3D11_BOX {
                left: (frame.left - outer.left) as u32,
                top: (frame.top - outer.top) as u32,
                front: 0,
                right: (frame.right - outer.left) as u32,
                bottom: (frame.bottom - outer.top) as u32,
                back: 1,
            };
            unsafe { self.pipeline.gpu.context.CopySubresourceRegion(&s.cropped, 0, 0, 0, 0, &s.drawn, 0, Some(&area)) };
            let content = SizeInt32 { Width: s.frame.0, Height: s.frame.1 };
            writer.write(frames, &mut self.pipeline, &s.cropped, content, epoch.elapsed().as_micros() as u64)?;
            writer.count(frames, started);
        }
        Ok(())
    }
}

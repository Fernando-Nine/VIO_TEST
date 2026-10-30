// Programs for "Só som" (#247): which processes are really playing, the name a person
// knows them by and their icon. The page sees names and pixels, never paths or PIDs.
use crate::{video::Canvas, wire};
use std::collections::{HashMap, HashSet};
use windows::{
    core::{Interface, HSTRING, PCWSTR, PWSTR},
    Win32::{
        Foundation::{ERROR_SUCCESS, HANDLE, SIZE, S_OK},
        Graphics::Gdi::{
            CreateDIBSection, DeleteObject, GdiFlush, GetDC, GetDIBits, ReleaseDC, BITMAPINFO, BITMAPINFOHEADER, BI_RGB,
            DIB_RGB_COLORS,
        },
        Media::Audio::{
            eRender, AudioSessionStateActive, IAudioSessionControl2, IAudioSessionManager2, IMMDeviceEnumerator,
            MMDeviceEnumerator, DEVICE_STATE_ACTIVE,
        },
        Storage::{
            FileSystem::{GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW},
            Packaging::Appx::GetApplicationUserModelId,
        },
        System::{
            Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL, COINIT_APARTMENTTHREADED},
            Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS},
            Threading::{QueryFullProcessImageNameW, PROCESS_NAME_WIN32},
        },
        UI::{
            Shell::{
                ExtractIconExW, IShellItem, IShellItemImageFactory, SHCreateItemFromParsingName, SIGDN_NORMALDISPLAY,
                SIIGBF_ICONONLY,
            },
            WindowsAndMessaging::{DestroyIcon, DrawIconEx, DI_NORMAL, HICON},
        },
    },
};

/// Icon side in pixels; the picker shows it at 40 px.
const ICON: u32 = 48;

/// Processes with an active audio session on any output device; call inside an MTA.
/// Paused players and silent background helpers keep an inactive session and stay out.
pub fn playing() -> HashSet<u32> {
    let mut found = HashSet::new();
    let _ = (|| -> windows::core::Result<()> {
        let enumerator: IMMDeviceEnumerator = unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) }?;
        let devices = unsafe { enumerator.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE) }?;
        for d in 0..unsafe { devices.GetCount() }? {
            let Ok(device) = (unsafe { devices.Item(d) }) else { continue };
            let Ok(manager) = (unsafe { device.Activate::<IAudioSessionManager2>(CLSCTX_ALL, None) }) else { continue };
            let Ok(sessions) = (unsafe { manager.GetSessionEnumerator() }) else { continue };
            for s in 0..unsafe { sessions.GetCount() }.unwrap_or(0) {
                let Ok(control) = (unsafe { sessions.GetSession(s) }).and_then(|c| c.cast::<IAudioSessionControl2>()) else {
                    continue;
                };
                let active = unsafe { control.GetState() }.is_ok_and(|state| state == AudioSessionStateActive);
                let system = unsafe { control.IsSystemSoundsSession() } == S_OK;
                match unsafe { control.GetProcessId() } {
                    Ok(pid) if active && !system && pid != 0 => {
                        found.insert(pid);
                    }
                    _ => {}
                }
            }
        }
        Ok(())
    })();
    found
}

/// Parent of every running process, to tie a browser's audio helper to its window.
pub fn parents() -> HashMap<u32, u32> {
    let mut parents = HashMap::new();
    let Ok(snapshot) = (unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }) else {
        return parents;
    };
    let snapshot = crate::capture::Owned(snapshot);
    let mut entry = PROCESSENTRY32W {
        dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
        ..Default::default()
    };
    let mut more = unsafe { Process32FirstW(snapshot.0, &mut entry) }.is_ok();
    while more {
        parents.insert(entry.th32ProcessID, entry.th32ParentProcessID);
        more = unsafe { Process32NextW(snapshot.0, &mut entry) }.is_ok();
    }
    parents
}

/// True when `pid` or one of its ancestors is in `set`.
pub fn descends(pid: u32, set: &HashSet<u32>, parents: &HashMap<u32, u32>) -> bool {
    let mut current = pid;
    // Bounded: parent ids are reused, so the chain may loop.
    for _ in 0..16 {
        if set.contains(&current) {
            return true;
        }
        match parents.get(&current) {
            Some(&parent) if parent != 0 && parent != current => current = parent,
            _ => return false,
        }
    }
    false
}

/// Windows' own hosts: they own windows or sessions but are never "a program playing"
/// to the person (#255). Compared by file name, case-insensitively.
const SHELL_HOSTS: [&str; 10] = [
    "applicationframehost.exe",
    "explorer.exe",
    "lockapp.exe",
    "searchapp.exe",
    "searchhost.exe",
    "shellexperiencehost.exe",
    "startmenuexperiencehost.exe",
    "systemsettingsbroker.exe",
    "textinputhost.exe",
    "widgets.exe",
];

pub fn shell_host(path: &[u16]) -> bool {
    let full = String::from_utf16_lossy(&path[..path.len().saturating_sub(1)]).to_lowercase();
    let base = full.rsplit(['\\', '/']).next().unwrap_or_default();
    SHELL_HOSTS.contains(&base)
}

/// Full path of a process's executable, nul-terminated.
pub fn executable(process: HANDLE) -> Option<Vec<u16>> {
    let mut buffer = vec![0u16; 1024];
    let mut length = buffer.len() as u32;
    unsafe { QueryFullProcessImageNameW(process, PROCESS_NAME_WIN32, PWSTR(buffer.as_mut_ptr()), &mut length) }.ok()?;
    buffer.truncate(length as usize);
    buffer.push(0);
    Some(buffer)
}

fn query(data: &[u8], block: &HSTRING) -> Option<(*const u8, usize)> {
    let (mut pointer, mut length) = (std::ptr::null_mut(), 0u32);
    let found = unsafe { VerQueryValueW(data.as_ptr() as *const _, block, &mut pointer, &mut length) }.as_bool();
    (found && !pointer.is_null() && length > 0).then_some((pointer as *const u8, length as usize))
}

/// The program's own name (FileDescription, e.g. "Spotify"), else the file name.
pub fn name(path: &[u16]) -> String {
    let file = PCWSTR(path.as_ptr());
    let stem = || {
        let full = String::from_utf16_lossy(&path[..path.len().saturating_sub(1)]);
        let base = full.rsplit(['\\', '/']).next().unwrap_or_default().to_string();
        base.strip_suffix(".exe").or_else(|| base.strip_suffix(".EXE")).map_or(base.clone(), str::to_string)
    };
    let size = unsafe { GetFileVersionInfoSizeW(file, None) };
    if size == 0 {
        return stem();
    }
    let mut data = vec![0u8; size as usize];
    if unsafe { GetFileVersionInfoW(file, None, size, data.as_mut_ptr() as *mut _) }.is_err() {
        return stem();
    }
    let mut languages = Vec::new();
    if let Some((pointer, length)) = query(&data, &HSTRING::from("\\VarFileInfo\\Translation")) {
        let pairs = unsafe { std::slice::from_raw_parts(pointer as *const u16, length / 2) };
        languages.extend(pairs.chunks_exact(2).map(|p| format!("{:04x}{:04x}", p[0], p[1])));
    }
    languages.extend(["040904b0".to_string(), "040904e4".to_string()]);
    for language in languages {
        let block = HSTRING::from(format!("\\StringFileInfo\\{language}\\FileDescription"));
        if let Some((pointer, length)) = query(&data, &block) {
            let text = unsafe { std::slice::from_raw_parts(pointer as *const u16, length) };
            let end = text.iter().position(|&c| c == 0).unwrap_or(text.len());
            let text = String::from_utf16_lossy(&text[..end]).trim().to_string();
            if !text.is_empty() {
                return text;
            }
        }
    }
    stem()
}

/// The Application User Model ID of a packaged (Store) app, nul-terminated; `None` for
/// a plain program. Its executable carries no useful name: the Media Player's
/// FileDescription is "microsoft.media.player" (#271).
pub fn package_app(process: HANDLE) -> Option<Vec<u16>> {
    // APPLICATION_USER_MODEL_ID_MAX_LENGTH, nul included.
    let mut buffer = vec![0u16; 130];
    let mut length = buffer.len() as u32;
    if unsafe { GetApplicationUserModelId(process, &mut length, Some(PWSTR(buffer.as_mut_ptr()))) } != ERROR_SUCCESS {
        return None;
    }
    let end = buffer.iter().position(|&c| c == 0)?;
    (end > 0).then(|| {
        buffer.truncate(end + 1);
        buffer
    })
}

/// Shell calls on their own STA thread: some shell extensions refuse the MTA.
fn on_sta<T: Send>(work: impl FnOnce() -> Option<T> + Send) -> Option<T> {
    std::thread::scope(|scope| {
        scope
            .spawn(|| {
                if unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) }.is_err() {
                    return None;
                }
                let result = work();
                unsafe { CoUninitialize() };
                result
            })
            .join()
            .ok()
            .flatten()
    })
}

/// The app as the Start menu lists it (`shell:AppsFolder`), where the Windows language applies.
fn app_item(app: &[u16]) -> Option<IShellItem> {
    let id = String::from_utf16_lossy(&app[..app.len().saturating_sub(1)]);
    unsafe { SHCreateItemFromParsingName(&HSTRING::from(format!("shell:AppsFolder\\{id}")), None) }.ok()
}

/// A packaged app's display name in the Windows language ("Reprodutor de Mídia").
pub fn app_name(app: &[u16]) -> Option<String> {
    on_sta(|| {
        let text = unsafe { app_item(app)?.GetDisplayName(SIGDN_NORMALDISPLAY) }.ok()?;
        let name = unsafe { text.to_string() }.ok();
        unsafe { CoTaskMemFree(Some(text.0 as *const _)) };
        name.map(|n| n.trim().to_string()).filter(|n| !n.is_empty() && !n.contains('!'))
    })
}

/// A packaged app's icon from its manifest logo, as `VIOT` + RGBA.
pub fn app_icon(app: &[u16]) -> Option<Vec<u8>> {
    on_sta(|| {
        let factory: IShellItemImageFactory = app_item(app)?.cast().ok()?;
        let size = SIZE { cx: ICON as i32, cy: ICON as i32 };
        let bitmap = unsafe { factory.GetImage(size, SIIGBF_ICONONLY) }.ok()?;
        let screen = unsafe { GetDC(None) };
        let mut info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: ICON as i32,
                biHeight: -(ICON as i32),
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };
        let mut bgra = vec![0u8; (ICON * ICON * 4) as usize];
        let lines = unsafe { GetDIBits(screen, bitmap, 0, ICON, Some(bgra.as_mut_ptr() as *mut _), &mut info, DIB_RGB_COLORS) };
        unsafe {
            ReleaseDC(None, screen);
            let _ = DeleteObject(bitmap.into());
        }
        (lines == ICON as i32).then(|| {
            // Premultiplied BGRA → straight RGBA.
            let mut rgba = Vec::with_capacity(bgra.len());
            for p in bgra.chunks_exact(4) {
                let alpha = p[3] as u32;
                let color = |c: u8| if alpha == 0 { 0 } else { (c as u32 * 255 / alpha).min(255) as u8 };
                rgba.extend_from_slice(&[color(p[2]), color(p[1]), color(p[0]), p[3]]);
            }
            wire::icon(&rgba, ICON, ICON)
        })
    })
}

/// One draw of `icon` over a solid background, as top-down BGRA.
fn draw(icon: HICON, background: u8) -> Option<Vec<u8>> {
    let screen = unsafe { GetDC(None) };
    if screen.is_invalid() {
        return None;
    }
    let result = (|| {
        let info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: ICON as i32,
                biHeight: -(ICON as i32),
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };
        let mut bits = std::ptr::null_mut();
        let dib = unsafe { CreateDIBSection(Some(screen), &info, DIB_RGB_COLORS, &mut bits, None, 0) }.ok()?;
        let canvas = Canvas::new(screen, dib)?;
        if bits.is_null() {
            return None;
        }
        let pixels = unsafe { std::slice::from_raw_parts_mut(bits as *mut u8, (ICON * ICON * 4) as usize) };
        pixels.fill(background);
        unsafe { DrawIconEx(canvas.dc, 0, 0, icon, ICON as i32, ICON as i32, 0, None, DI_NORMAL) }.ok()?;
        unsafe {
            let _ = GdiFlush();
        }
        Some(pixels.to_vec())
    })();
    unsafe { ReleaseDC(None, screen) };
    result
}

/// The executable's icon as `VIOT` + RGBA. Drawn over black and over white: the
/// difference gives the transparency GDI does not keep.
pub fn icon(path: &[u16]) -> Option<Vec<u8>> {
    let mut large = HICON::default();
    let count = unsafe { ExtractIconExW(PCWSTR(path.as_ptr()), 0, Some(&mut large), None, 1) };
    if count == 0 || large.is_invalid() {
        return None;
    }
    let layers = draw(large, 0).zip(draw(large, 255));
    unsafe {
        let _ = DestroyIcon(large);
    }
    let (black, white) = layers?;
    let mut rgba = Vec::with_capacity(black.len());
    for (b, w) in black.chunks_exact(4).zip(white.chunks_exact(4)) {
        let alpha = 255 - (w[1] as i32 - b[1] as i32).clamp(0, 255);
        let color = |c: u8| if alpha == 0 { 0 } else { (c as i32 * 255 / alpha).min(255) as u8 };
        rgba.extend_from_slice(&[color(b[2]), color(b[1]), color(b[0]), alpha as u8]);
    }
    Some(wire::icon(&rgba, ICON, ICON))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// #271: a Store app shows its display name and package logo, not its executable's.
    /// Settings is packaged on every Windows, Server included.
    /// `cargo test --release -- --ignored --nocapture store_app_name`
    #[test]
    #[ignore]
    fn store_app_name() {
        let app: Vec<u16> = "windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel"
            .encode_utf16()
            .chain([0])
            .collect();
        let name = app_name(&app).expect("nome do pacote");
        let icon = app_icon(&app).expect("ícone do pacote");
        println!("VIO app da Store: {name:?}, ícone {} bytes", icon.len());
        assert!(!name.contains('.') && !name.contains('!'), "{name}");
    }
}

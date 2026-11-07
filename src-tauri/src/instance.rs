//! One app per channel and Windows session (#303). A named mutex marks the running app;
//! a second launch brings that window to the front and quits without opening another.
//! The channel identifier names both the mutex and the window class, so VIO and
//! VIO Teste never block each other.
use std::time::{Duration, Instant};
use windows::{
    core::{HSTRING, PCWSTR},
    Win32::{
        Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, HANDLE, WAIT_ABANDONED, WAIT_OBJECT_0},
        System::Threading::{CreateMutexW, ReleaseMutex, WaitForSingleObject},
        UI::WindowsAndMessaging::{FindWindowW, IsIconic, SetForegroundWindow, ShowWindow, SW_RESTORE},
    },
};

/// How long a second launch waits for the running app to show its window or exit.
/// Covers the update check (20 s) that runs before the first window opens, and the
/// restart after an update, where the new process starts before the old one quits.
const WAIT: Duration = Duration::from_secs(30);
const POLL_MS: u32 = 250;

/// Held for the whole run; Windows releases the mutex when the process ends.
pub struct Instance(Option<HANDLE>);

impl Drop for Instance {
    fn drop(&mut self) {
        if let Some(handle) = self.0.take() {
            unsafe {
                let _ = ReleaseMutex(handle);
                let _ = CloseHandle(handle);
            }
        }
    }
}

/// Class of the main window, so another launch can find it without matching titles.
pub fn class(identifier: &str) -> String {
    identifier.to_owned()
}

/// `Some` when this process should open the app; `None` when it should quit because
/// another one is running (its window was brought forward, or it never answered).
pub fn claim(identifier: &str) -> Option<Instance> {
    let name = HSTRING::from(format!("Local\\{identifier}.instance"));
    let Ok(handle) = (unsafe { CreateMutexW(None, true, &name) }) else {
        // Without the mutex, opening a second window beats not opening at all.
        return Some(Instance(None));
    };
    if unsafe { GetLastError() } != ERROR_ALREADY_EXISTS {
        return Some(Instance(Some(handle)));
    }
    let class = HSTRING::from(class(identifier));
    let start = Instant::now();
    while start.elapsed() < WAIT {
        if raise(&class) {
            unsafe {
                let _ = CloseHandle(handle);
            }
            return None;
        }
        // The running app quit (closed, or restarting after an update): take over.
        let event = unsafe { WaitForSingleObject(handle, POLL_MS) };
        if event == WAIT_OBJECT_0 || event == WAIT_ABANDONED {
            return Some(Instance(Some(handle)));
        }
    }
    unsafe {
        let _ = CloseHandle(handle);
    }
    None
}

fn raise(class: &HSTRING) -> bool {
    let Ok(window) = (unsafe { FindWindowW(class, PCWSTR::null()) }) else {
        return false;
    };
    if window.is_invalid() {
        return false;
    }
    unsafe {
        // A hidden window (tray, #282) must be shown by its own process; only restore here.
        if IsIconic(window).as_bool() {
            let _ = ShowWindow(window, SW_RESTORE);
        }
        let _ = SetForegroundWindow(window);
    }
    true
}

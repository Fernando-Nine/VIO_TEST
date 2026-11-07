//! One app per channel and Windows session (#303). A named mutex marks the running app;
//! a second launch brings that window to the front and quits without opening another.
//! The channel identifier names both the mutex and the window class, so VIO and
//! VIO Teste never block each other.
use crate::log;
use std::time::{Duration, Instant};
use windows::{
    core::{HSTRING, PCWSTR},
    Win32::{
        Foundation::{
            CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, E_ACCESSDENIED, HANDLE, HWND,
            WAIT_ABANDONED, WAIT_OBJECT_0,
        },
        System::Threading::{CreateMutexW, ReleaseMutex, WaitForSingleObject},
        UI::WindowsAndMessaging::{
            FindWindowW, FlashWindowEx, IsIconic, IsWindowVisible, SetForegroundWindow,
            ShowWindow, FLASHWINFO, FLASHW_ALL, FLASHW_TIMERNOFG, SW_RESTORE,
        },
    },
};

/// How long a second launch waits for the running app to show its window or exit.
/// The first window only opens after the update check and download, and the updater's
/// download has no timeout of its own, so this is a ceiling rather than an estimate.
const WAIT: Duration = Duration::from_secs(120);
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
    format!("VIO.Main.{identifier}")
}

/// `Some` when this process should open the app; `None` when it should quit because
/// another one is running (its window was brought forward, or it never answered).
pub fn claim(identifier: &str) -> Option<Instance> {
    claim_within(identifier, WAIT)
}

enum Mutex {
    Owned(HANDLE),
    /// Someone else holds it; the handle lets us wait for it to be released.
    Taken(HANDLE),
    /// It exists but cannot be opened (created by an elevated copy): poll by name.
    Denied,
    Failed,
}

fn open(name: &HSTRING) -> Mutex {
    match unsafe { CreateMutexW(None, true, name) } {
        Ok(handle) if unsafe { GetLastError() } == ERROR_ALREADY_EXISTS => Mutex::Taken(handle),
        Ok(handle) => Mutex::Owned(handle),
        Err(error) if error.code() == E_ACCESSDENIED => Mutex::Denied,
        Err(error) => {
            log::write("instance", &format!("mutex failed {:#x}", error.code().0));
            Mutex::Failed
        }
    }
}

fn claim_within(identifier: &str, wait: Duration) -> Option<Instance> {
    let name = HSTRING::from(format!("Local\\{identifier}.instance"));
    let class = HSTRING::from(class(identifier));
    let start = Instant::now();
    let mut denied = false;
    loop {
        let handle = match open(&name) {
            Mutex::Owned(handle) => return Some(Instance(Some(handle))),
            // Without the mutex, opening a second window beats not opening at all.
            Mutex::Failed => return Some(Instance(None)),
            Mutex::Denied => {
                if !denied {
                    log::write("instance", "mutex access denied, treated as running");
                    denied = true;
                }
                None
            }
            Mutex::Taken(handle) => Some(handle),
        };
        if raise(&class) {
            close(handle);
            return None;
        }
        if start.elapsed() >= wait {
            log::write("instance", "running app never showed a window, giving up");
            close(handle);
            return None;
        }
        match handle {
            Some(handle) => {
                // A running app that quits (closed, or `app.restart()` after an update,
                // which spawns the new process before the old one exits) leaves the mutex
                // abandoned: the wait then returns WAIT_ABANDONED and hands it to us.
                let event = unsafe { WaitForSingleObject(handle, POLL_MS) };
                if event == WAIT_OBJECT_0 || event == WAIT_ABANDONED {
                    return Some(Instance(Some(handle)));
                }
                close(Some(handle));
            }
            None => std::thread::sleep(Duration::from_millis(POLL_MS.into())),
        }
    }
}

fn close(handle: Option<HANDLE>) {
    if let Some(handle) = handle {
        unsafe {
            let _ = CloseHandle(handle);
        }
    }
}

/// Brings the running app's window forward. `false` while it has no window yet.
fn raise(class: &HSTRING) -> bool {
    let Ok(window) = (unsafe { FindWindowW(class, PCWSTR::null()) }) else {
        return false;
    };
    if window.is_invalid() {
        return false;
    }
    unsafe {
        // Restore covers minimized and hidden (tray, #282) windows alike.
        if IsIconic(window).as_bool() || !IsWindowVisible(window).as_bool() {
            let _ = ShowWindow(window, SW_RESTORE);
        }
        if !SetForegroundWindow(window).as_bool() {
            // Windows may refuse focus to a background process; flash the taskbar instead.
            flash(window);
        }
    }
    true
}

fn flash(window: HWND) {
    let info = FLASHWINFO {
        cbSize: size_of::<FLASHWINFO>() as u32,
        hwnd: window,
        dwFlags: FLASHW_ALL | FLASHW_TIMERNOFG,
        uCount: 0,
        dwTimeout: 0,
    };
    unsafe {
        let _ = FlashWindowEx(&info);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    fn id(test: &str) -> String {
        format!("studio.nerdquest.vio.unit-{}-{test}", std::process::id())
    }

    #[test]
    fn second_claim_waits_then_quits() {
        let id = id("second");
        let first = claim_within(&id, Duration::ZERO).expect("first claim opens");
        assert!(first.0.is_some());
        // Mutex ownership is per thread, so the second launch runs on another thread.
        let other = id.clone();
        let second =
            thread::spawn(move || claim_within(&other, Duration::from_millis(600)).is_some());
        assert!(!second.join().unwrap());
        drop(first);
        let third = thread::spawn(move || claim_within(&id, Duration::ZERO).is_some());
        assert!(third.join().unwrap());
    }

    #[test]
    fn abandoned_mutex_is_taken_over() {
        let id = id("abandoned");
        let other = id.clone();
        // The owner thread ends without releasing, as a killed or restarting app would.
        thread::spawn(move || std::mem::forget(claim_within(&other, Duration::ZERO)))
            .join()
            .unwrap();
        let next = thread::spawn(move || claim_within(&id, Duration::from_secs(2)).is_some());
        assert!(next.join().unwrap());
    }
}

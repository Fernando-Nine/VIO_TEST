//! PROVISIONAL (#344): read and change the Windows "Communications activity" preference.
//!
//! WebView2 opens the microphone as a communications stream, so Windows lowers every
//! other sound while VIO is in a call. Until VIO captures the microphone itself (#352)
//! and can opt its own stream out of ducking, the app offers to set this per-user
//! preference to "Do nothing". When #352 lands, this module, its commands and the
//! prompt/toggle in the interface are removed and VIO stops changing Windows settings.
//!
//! Backing store of mmsys.cpl › Communications (per user, no admin rights):
//! `HKCU\Software\Microsoft\Multimedia\Audio`, DWORD `UserDuckingPreference`:
//! 0 = mute other sounds, 1 = reduce by 80% (Windows default when absent),
//! 2 = reduce by 50%, 3 = do nothing. Windows applies it when a communications
//! stream opens, so the interface reopens the microphone after a change.
use windows::core::w;
use windows::Win32::Foundation::{ERROR_FILE_NOT_FOUND, ERROR_PATH_NOT_FOUND, ERROR_SUCCESS};
use windows::Win32::System::Registry::{
    RegDeleteKeyValueW, RegGetValueW, RegSetKeyValueW, HKEY_CURRENT_USER, REG_DWORD,
    RRF_RT_REG_DWORD,
};

const KEY: windows::core::PCWSTR = w!("Software\\Microsoft\\Multimedia\\Audio");
const VALUE: windows::core::PCWSTR = w!("UserDuckingPreference");

/// The raw stored value (unknown numbers included, so they can be restored as they
/// were), or `None` when the value or key is absent and Windows uses its default.
pub fn read() -> Result<Option<u32>, String> {
    let mut data = 0u32;
    let mut size = std::mem::size_of::<u32>() as u32;
    let status = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            KEY,
            VALUE,
            RRF_RT_REG_DWORD,
            None,
            Some(&mut data as *mut u32 as *mut _),
            Some(&mut size),
        )
    };
    match status {
        ERROR_SUCCESS => Ok(Some(data)),
        ERROR_FILE_NOT_FOUND | ERROR_PATH_NOT_FOUND => Ok(None),
        _ => Err("O Windows não informou a preferência de comunicações.".into()),
    }
}

/// Writes `value` (any DWORD, to restore an unknown one exactly), or removes it
/// (back to the Windows default) when `None`.
pub fn write(value: Option<u32>) -> Result<(), String> {
    let status = match value {
        Some(v) => unsafe {
            RegSetKeyValueW(
                HKEY_CURRENT_USER,
                KEY,
                VALUE,
                REG_DWORD.0,
                Some(&v as *const u32 as *const _),
                std::mem::size_of::<u32>() as u32,
            )
        },
        None => match unsafe { RegDeleteKeyValueW(HKEY_CURRENT_USER, KEY, VALUE) } {
            ERROR_FILE_NOT_FOUND | ERROR_PATH_NOT_FOUND => ERROR_SUCCESS,
            other => other,
        },
    };
    if status == ERROR_SUCCESS {
        Ok(())
    } else {
        Err("O Windows não aceitou mudar a preferência de comunicações.".into())
    }
}

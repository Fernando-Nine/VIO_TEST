#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#[cfg(windows)]
mod capture;
#[cfg(windows)]
mod host;
mod wire;
#[cfg(windows)]
fn main() {
    host::run();
}
#[cfg(not(windows))]
fn main() {
    eprintln!("VIO Desktop requires Windows 11 x64.");
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#[cfg(windows)]
mod capture;
#[cfg(windows)]
mod shell;
#[cfg(windows)]
mod stream;
#[cfg(windows)]
mod video;
mod wire;
#[cfg(windows)]
fn main() {
    shell::run();
}
#[cfg(not(windows))]
fn main() {
    eprintln!("VIO Desktop requires Windows x64.");
}

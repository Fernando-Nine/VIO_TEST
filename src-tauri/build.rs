fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    // Declaring the app commands makes each one require an explicit capability.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "desktop_capabilities",
            "desktop_sources",
            "desktop_start_audio",
            "desktop_read_audio",
            "desktop_stop_audio",
        ]),
    ))
    .expect("Tauri configuration must be valid");
}

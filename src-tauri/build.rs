fn main() {
    println!("cargo:rerun-if-changed=native");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    cc::Build::new()
        .cpp(true)
        .std("c++17")
        .flag("/EHsc")
        .flag("/utf-8")
        .define("_WIN32_WINNT", "0x0A00")
        .file("native/wasapi.cpp")
        .compile("vio_wasapi");
    for library in ["ole32", "mmdevapi", "bcrypt", "user32"] {
        println!("cargo:rustc-link-lib={library}");
    }
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "desktop_capabilities",
            "desktop_sources",
            "desktop_start_audio",
            "desktop_read_audio",
            "desktop_stop_audio",
            "desktop_compact",
        ]),
    ))
    .expect("Tauri configuration must be valid");
}

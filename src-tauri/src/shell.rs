use crate::capture::{self, Manager, Source};
use crate::video::{VideoManager, VideoSource};
use serde::Serialize;
use std::time::Duration;
use tauri::{AppHandle, Manager as _, State, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_updater::UpdaterExt;

// The window loads the interface bundled in the installer. Only that local origin
// may call the capture commands; navigation never leaves it.
fn local(url: &Url) -> bool {
    url.scheme() == "https" && url.host_str() == Some("tauri.localhost") && url.port().is_none()
}

fn trusted(window: &WebviewWindow) -> Result<(), String> {
    match window.url() {
        Ok(url) if window.label() == "main" && local(&url) => Ok(()),
        _ => Err("Este comando só está disponível no aplicativo VIO.".into()),
    }
}

fn valid_id(id: &str) -> Result<(), String> {
    if id.len() == 32 && id.bytes().all(|b| b.is_ascii_hexdigit()) {
        Ok(())
    } else {
        Err("Identificador de captura inválido.".into())
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Capabilities {
    protocol: u32,
    windows_build: u32,
    process_audio: bool,
}

#[tauri::command]
fn desktop_capabilities(window: WebviewWindow) -> Result<Capabilities, String> {
    trusted(&window)?;
    let build = capture::windows_build();
    Ok(Capabilities {
        protocol: 1,
        windows_build: build,
        process_audio: build >= capture::MIN_BUILD,
    })
}

#[tauri::command]
fn desktop_sources(window: WebviewWindow, state: State<'_, Manager>) -> Result<Vec<Source>, String> {
    trusted(&window)?;
    state.sources()
}

#[tauri::command]
fn desktop_start_audio(
    window: WebviewWindow,
    state: State<'_, Manager>,
    source_id: String,
) -> Result<String, String> {
    trusted(&window)?;
    valid_id(&source_id)?;
    state.start(&source_id)
}

#[tauri::command]
async fn desktop_read_audio(
    window: WebviewWindow,
    state: State<'_, Manager>,
    capture_id: String,
) -> Result<tauri::ipc::Response, String> {
    trusted(&window)?;
    valid_id(&capture_id)?;
    let capture = state.capture(&capture_id)?;
    let bytes = tauri::async_runtime::spawn_blocking(move || capture.read())
        .await
        .map_err(|_| "Não foi possível receber o áudio do Windows.")??;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
fn desktop_stop_audio(window: WebviewWindow, state: State<'_, Manager>, capture_id: String) -> Result<(), String> {
    trusted(&window)?;
    valid_id(&capture_id)?;
    state.stop(Some(&capture_id));
    Ok(())
}

#[tauri::command]
fn desktop_video_sources(window: WebviewWindow, state: State<'_, VideoManager>) -> Result<Vec<VideoSource>, String> {
    trusted(&window)?;
    state.sources()
}

#[tauri::command]
async fn desktop_video_thumbnail(
    window: WebviewWindow,
    app: AppHandle,
    source_id: String,
) -> Result<tauri::ipc::Response, String> {
    trusted(&window)?;
    valid_id(&source_id)?;
    let bytes = tauri::async_runtime::spawn_blocking(move || app.state::<VideoManager>().thumbnail(&source_id))
        .await
        .map_err(|_| "Não foi possível gerar a miniatura.")??;
    Ok(tauri::ipc::Response::new(bytes))
}

async fn update(app: &AppHandle) -> tauri_plugin_updater::Result<()> {
    let mut builder = app.updater_builder().timeout(Duration::from_secs(20));
    // VIO Teste follows whatever its feed points at, even a lower prerelease number.
    if app.config().identifier.ends_with(".test") {
        builder = builder.version_comparator(|current, update| update.version != current);
    }
    let updater = builder.build()?;
    if let Some(update) = updater.check().await? {
        // On Windows the installer closes the app and starts the new version.
        update.download_and_install(|_, _| {}, || {}).await?;
        app.restart();
    }
    Ok(())
}

fn open(app: &AppHandle) -> tauri::Result<()> {
    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title(app.package_info().name.clone())
        .inner_size(1280.0, 800.0)
        .min_inner_size(720.0, 480.0)
        .use_https_scheme(true)
        .on_navigation(local)
        .build()?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Manager::default())
        .manage(VideoManager::default())
        .invoke_handler(tauri::generate_handler![
            desktop_capabilities,
            desktop_sources,
            desktop_start_audio,
            desktop_read_audio,
            desktop_stop_audio,
            desktop_video_sources,
            desktop_video_thumbnail
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Update only before the room opens: installing must never end a call.
                // Failure (offline, no release yet) just opens the current version.
                let _ = update(&handle).await;
                if open(&handle).is_err() {
                    handle.exit(1);
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed | tauri::WindowEvent::CloseRequested { .. }) {
                window.state::<Manager>().stop(None);
            }
        })
        .run(tauri::generate_context!())
        .expect("VIO failed to start");
}

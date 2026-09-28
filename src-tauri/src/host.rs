use crate::capture::{self, Manager, Source};
use serde::Serialize;
use std::sync::Mutex;
use tauri::{Manager as _, State, WebviewWindow};

fn trusted(window: &WebviewWindow) -> Result<(), String> {
    let url = window.url().map_err(|_| "Janela indisponível.")?;
    if window.label() == "main"
        && url.scheme() == "https"
        && url.host_str() == Some("tauri.localhost")
        && url.port().is_none()
    {
        Ok(())
    } else {
        Err("Este comando só está disponível no aplicativo VIO.".into())
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
        process_audio: build >= 22000,
    })
}
#[tauri::command]
fn desktop_sources(
    window: WebviewWindow,
    state: State<'_, Manager>,
) -> Result<Vec<Source>, String> {
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
fn desktop_stop_audio(
    window: WebviewWindow,
    state: State<'_, Manager>,
    capture_id: String,
) -> Result<(), String> {
    trusted(&window)?;
    valid_id(&capture_id)?;
    state.stop(Some(&capture_id));
    Ok(())
}
#[derive(Default)]
struct Compact(Mutex<Option<(tauri::PhysicalSize<u32>, tauri::PhysicalPosition<i32>, bool)>>);
#[tauri::command]
fn desktop_compact(
    window: WebviewWindow,
    state: State<'_, Compact>,
    enabled: bool,
) -> Result<(), String> {
    trusted(&window)?;
    let mut saved = state
        .0
        .lock()
        .map_err(|_| "Não foi possível ajustar a janela.")?;
    let mut change = || -> tauri::Result<()> {
        if enabled && saved.is_none() {
            let old = (
                window.inner_size()?,
                window.outer_position()?,
                window.is_maximized()?,
            );
            window.unmaximize()?;
            window.set_always_on_top(true)?;
            window.set_size(tauri::LogicalSize::new(780.0, 500.0))?;
            *saved = Some(old);
        } else if !enabled {
            window.set_always_on_top(false)?;
            if let Some((size, position, maximized)) = saved.take() {
                window.set_size(size)?;
                window.set_position(position)?;
                if maximized {
                    window.maximize()?;
                }
            }
        }
        Ok(())
    };
    change().map_err(|_| "Não foi possível ajustar a janela.")
}
pub fn run() {
    tauri::Builder::default()
        .manage(Manager::default())
        .manage(Compact::default())
        .invoke_handler(tauri::generate_handler![
            desktop_capabilities,
            desktop_sources,
            desktop_start_audio,
            desktop_read_audio,
            desktop_stop_audio,
            desktop_compact
        ])
        .setup(|app| {
            tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("VIO · Windows")
            .inner_size(1280.0, 800.0)
            .min_inner_size(390.0, 420.0)
            .use_https_scheme(true)
            .on_navigation(|url| {
                url.scheme() == "https"
                    && url.host_str() == Some("tauri.localhost")
                    && url.port().is_none()
            })
            .build()?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(
                event,
                tauri::WindowEvent::Destroyed | tauri::WindowEvent::CloseRequested { .. }
            ) {
                window.state::<Manager>().stop(None);
            }
        })
        .run(tauri::generate_context!())
        .expect("VIO desktop host could not start");
}

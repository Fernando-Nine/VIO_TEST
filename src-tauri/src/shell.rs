use crate::capture::{self, Manager, Source};
use crate::log;
use crate::stream::{Options, Started, StreamManager, Tick};
use crate::video::{VideoManager, VideoSource};
use serde::Serialize;
use std::time::Duration;
use tauri::{AppHandle, Manager as _, State, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_updater::UpdaterExt;
use webview2_com::{
    CoTaskMemPWSTR,
    Microsoft::Web::WebView2::Win32::{
        ICoreWebView2PermissionRequestedEventArgs, ICoreWebView2PermissionRequestedEventArgs3,
        COREWEBVIEW2_PERMISSION_KIND, COREWEBVIEW2_PERMISSION_KIND_AUTOPLAY,
        COREWEBVIEW2_PERMISSION_KIND_CAMERA, COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
        COREWEBVIEW2_PERMISSION_STATE_ALLOW, COREWEBVIEW2_PERMISSION_STATE_DEFAULT,
        COREWEBVIEW2_PERMISSION_STATE_DENY, COREWEBVIEW2_PROCESS_FAILED_KIND,
        COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_EXITED,
    },
    PermissionRequestedEventHandler, ProcessFailedEventHandler,
};
use windows::core::{Interface, PWSTR};

// The window loads the interface bundled in the installer. Only that local origin
// may call the capture commands; navigation never leaves it.
fn local(url: &Url) -> bool {
    url.scheme() == "https"
        && url.host_str() == Some("tauri.localhost")
        && url.port().is_none()
        && url.username().is_empty()
        && url.password().is_none()
}

/// What the app answers to a WebView2 permission request (#320).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Decision {
    Allow,
    Deny,
    /// Leave WebView2's own behavior. Only autoplay: WebView2 shows no prompt for it and
    /// follows Chromium's autoplay policy; denying it could silence the `<audio>` of
    /// `RemoteVoice` before a click, and that element drives the remote speaking indicator.
    Default,
}

/// The installer terms already tell the user the app uses the microphone and the camera,
/// so the bundled page gets them without the WebView2 prompt. Everything else is denied,
/// and so is any other origin (`about:blank`, empty or invalid URIs included). Screen
/// capture is not a `PermissionRequested` kind: the `getDisplayMedia` fallback keeps the
/// WebView2 picker, which is a choice of content.
fn decide(kind: COREWEBVIEW2_PERMISSION_KIND, uri: &str) -> Decision {
    if kind == COREWEBVIEW2_PERMISSION_KIND_AUTOPLAY {
        return Decision::Default;
    }
    let from_app = Url::parse(uri).is_ok_and(|url| local(&url));
    if from_app
        && (kind == COREWEBVIEW2_PERMISSION_KIND_MICROPHONE
            || kind == COREWEBVIEW2_PERMISSION_KIND_CAMERA)
    {
        Decision::Allow
    } else {
        Decision::Deny
    }
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
async fn desktop_sources(window: WebviewWindow, app: AppHandle) -> Result<Vec<Source>, String> {
    trusted(&window)?;
    tauri::async_runtime::spawn_blocking(move || app.state::<Manager>().sources())
        .await
        .map_err(|_| "Não foi possível listar os programas.")?
}

#[tauri::command]
async fn desktop_sound_icon(
    window: WebviewWindow,
    app: AppHandle,
    source_id: String,
) -> Result<tauri::ipc::Response, String> {
    trusted(&window)?;
    valid_id(&source_id)?;
    let bytes =
        tauri::async_runtime::spawn_blocking(move || app.state::<Manager>().icon(&source_id))
            .await
            .map_err(|_| "Não foi possível ler o ícone.")??;
    Ok(tauri::ipc::Response::new(bytes))
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

#[tauri::command]
fn desktop_video_sources(
    window: WebviewWindow,
    state: State<'_, VideoManager>,
) -> Result<Vec<VideoSource>, String> {
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
    let bytes = tauri::async_runtime::spawn_blocking(move || {
        app.state::<VideoManager>().thumbnail(&source_id)
    })
    .await
    .map_err(|_| "Não foi possível gerar a miniatura.")??;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
async fn desktop_video_start(
    window: WebviewWindow,
    source_id: String,
    width: u32,
    height: u32,
    fps: u32,
    cursor: bool,
) -> Result<Started, String> {
    trusted(&window)?;
    valid_id(&source_id)?;
    let options = Options {
        width,
        height,
        fps,
        cursor,
    };
    tauri::async_runtime::spawn_blocking(move || {
        window
            .state::<StreamManager>()
            .start(&window, &source_id, options)
    })
    .await
    .map_err(|_| "Não foi possível iniciar a captura da imagem.")?
}

#[tauri::command]
async fn desktop_video_wait(
    window: WebviewWindow,
    state: State<'_, StreamManager>,
    capture_id: String,
    after: u32,
) -> Result<Tick, String> {
    trusted(&window)?;
    valid_id(&capture_id)?;
    let stream = state.stream(&capture_id)?;
    tauri::async_runtime::spawn_blocking(move || stream.wait(after))
        .await
        .map_err(|_| "A captura da imagem parou.")?
}

#[tauri::command]
async fn desktop_video_stop(window: WebviewWindow, capture_id: String) -> Result<(), String> {
    trusted(&window)?;
    valid_id(&capture_id)?;
    let app = window.app_handle().clone();
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<StreamManager>().stop(&app, Some(&capture_id))
    })
    .await
    .map_err(|_| "Não foi possível encerrar a captura.")?;
    Ok(())
}

/// Audio source matching a native video source: its application, or the whole PC.
#[tauri::command]
fn desktop_share_audio(
    window: WebviewWindow,
    audio: State<'_, Manager>,
    video: State<'_, VideoManager>,
    source_id: String,
    system: bool,
) -> Result<Source, String> {
    trusted(&window)?;
    valid_id(&source_id)?;
    if system {
        audio.link(None)
    } else {
        audio.link(Some(video.audio_target(&source_id)?))
    }
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
    let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title(app.package_info().name.clone())
        .inner_size(1280.0, 800.0)
        .min_inner_size(720.0, 480.0)
        .use_https_scheme(true)
        .on_navigation(local)
        .build()?;
    window.with_webview(|webview| {
        if let Err(error) = watch_page(&webview) {
            log::write("webview", &format!("watch failed {:#x}", error.code().0));
        }
    })?;
    Ok(())
}

/// A crashed page is logged and reloaded instead of leaving a blank window (#246).
fn watch_page(webview: &tauri::webview::PlatformWebview) -> windows::core::Result<()> {
    let core = unsafe { webview.controller().CoreWebView2() }?;
    let handler = ProcessFailedEventHandler::create(Box::new(|sender, args| {
        let mut kind = COREWEBVIEW2_PROCESS_FAILED_KIND::default();
        if let Some(args) = args {
            unsafe { args.ProcessFailedKind(&mut kind) }?;
        }
        log::write("webview", &format!("process failed, kind {}", kind.0));
        if kind == COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_EXITED {
            if let Some(sender) = sender {
                unsafe { sender.Reload() }?;
            }
        }
        Ok(())
    }));
    let mut token = 0i64;
    unsafe { core.add_ProcessFailed(&handler, &mut token) }?;

    // #320: microphone and camera without the "tauri.localhost wants to use" prompt.
    // Registered after wry's own handlers, so WebView2 calls this one last and its state is
    // what counts. wry's clipboard handler is not even registered: Tauri only turns it on
    // with `enable_clipboard_access()` (tauri-runtime 2.12 `WebviewAttributes::clipboard`
    // defaults to false; wry 0.57 `webview2/mod.rs` checks `attributes.clipboard`).
    let handler = PermissionRequestedEventHandler::create(Box::new(|_, args| {
        match args {
            Some(args) => answer(&args),
            None => log::write("permission", "request without args"),
        }
        Ok(())
    }));
    unsafe { core.add_PermissionRequested(&handler, &mut token) }
}

fn failed(step: &str, error: &windows::core::Error) {
    log::write(
        "permission",
        &format!("{step} failed {:#x}", error.code().0),
    );
}

/// Closed by default: the request is denied first and only refined after every read
/// succeeded, so a COM failure never falls back to the WebView2 prompt.
fn answer(args: &ICoreWebView2PermissionRequestedEventArgs) {
    if let Err(error) = unsafe { args.SetState(COREWEBVIEW2_PERMISSION_STATE_DENY) } {
        failed("deny", &error);
    }
    // Never persist an answer: a later build decides again from scratch.
    let unsaved = match args.cast::<ICoreWebView2PermissionRequestedEventArgs3>() {
        Ok(args) => match unsafe { args.SetSavesInProfile(false) } {
            Ok(()) => true,
            Err(error) => {
                failed("unsaved", &error);
                false
            }
        },
        Err(error) => {
            failed("args3", &error);
            false
        }
    };
    let mut kind = COREWEBVIEW2_PERMISSION_KIND::default();
    if let Err(error) = unsafe { args.PermissionKind(&mut kind) } {
        failed("kind", &error);
        return;
    }
    // Uri is "the origin of the web content that requests the permission", and the
    // CoreWebView2 handler also runs for requests from a CoreWebView2Frame (after the
    // frame's own handlers), so a cross-origin iframe reports its own origin and is denied.
    // learn.microsoft.com/microsoft-edge/webview2/reference/win32/
    // icorewebview2permissionrequestedeventargs (get_Uri) and ...eventargs2 (put_Handled).
    // The app CSP also has `frame-src 'none'`.
    let mut raw = PWSTR::null();
    let uri = match unsafe { args.Uri(&mut raw) } {
        Ok(()) if !raw.is_null() => CoTaskMemPWSTR::from(raw).to_string(),
        Ok(()) => String::new(),
        Err(error) => {
            failed("uri", &error);
            String::new()
        }
    };
    let mut decision = decide(kind, &uri);
    if decision == Decision::Allow && !unsaved {
        // An allow that might be saved in the profile is not given.
        decision = Decision::Deny;
    }
    let state = match decision {
        Decision::Allow => COREWEBVIEW2_PERMISSION_STATE_ALLOW,
        Decision::Deny => COREWEBVIEW2_PERMISSION_STATE_DENY,
        Decision::Default => COREWEBVIEW2_PERMISSION_STATE_DEFAULT,
    };
    if state != COREWEBVIEW2_PERMISSION_STATE_DENY {
        if let Err(error) = unsafe { args.SetState(state) } {
            failed("state", &error);
            return;
        }
    }
    // Only the kind: the URI never goes to the log.
    log::write("permission", &format!("kind {} {:?}", kind.0, decision));
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Manager::default())
        .manage(VideoManager::default())
        .manage(StreamManager::default())
        .invoke_handler(tauri::generate_handler![
            desktop_capabilities,
            desktop_sources,
            desktop_sound_icon,
            desktop_start_audio,
            desktop_read_audio,
            desktop_stop_audio,
            desktop_video_sources,
            desktop_video_thumbnail,
            desktop_video_start,
            desktop_video_wait,
            desktop_video_stop,
            desktop_share_audio
        ])
        .setup(|app| {
            if let Ok(dir) = app.path().app_log_dir() {
                log::init(dir, &app.package_info().version.to_string());
            }
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
            if matches!(
                event,
                tauri::WindowEvent::Destroyed | tauri::WindowEvent::CloseRequested { .. }
            ) {
                window.state::<Manager>().stop(None);
                window
                    .state::<StreamManager>()
                    .stop(window.app_handle(), None);
            }
        })
        .run(tauri::generate_context!())
        .expect("VIO failed to start");
}

#[cfg(test)]
mod tests {
    use super::{decide, Decision};
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        COREWEBVIEW2_PERMISSION_KIND_AUTOPLAY, COREWEBVIEW2_PERMISSION_KIND_CAMERA,
        COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ, COREWEBVIEW2_PERMISSION_KIND_FILE_READ_WRITE,
        COREWEBVIEW2_PERMISSION_KIND_GEOLOCATION, COREWEBVIEW2_PERMISSION_KIND_LOCAL_FONTS,
        COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
        COREWEBVIEW2_PERMISSION_KIND_MIDI_SYSTEM_EXCLUSIVE_MESSAGES,
        COREWEBVIEW2_PERMISSION_KIND_MULTIPLE_AUTOMATIC_DOWNLOADS,
        COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS, COREWEBVIEW2_PERMISSION_KIND_OTHER_SENSORS,
        COREWEBVIEW2_PERMISSION_KIND_UNKNOWN_PERMISSION,
        COREWEBVIEW2_PERMISSION_KIND_WINDOW_MANAGEMENT,
    };

    const PAGE: &str = "https://tauri.localhost/index.html";

    #[test]
    fn local_page_gets_microphone_and_camera() {
        assert_eq!(
            decide(COREWEBVIEW2_PERMISSION_KIND_MICROPHONE, PAGE),
            Decision::Allow
        );
        assert_eq!(
            decide(COREWEBVIEW2_PERMISSION_KIND_CAMERA, PAGE),
            Decision::Allow
        );
        assert_eq!(
            decide(
                COREWEBVIEW2_PERMISSION_KIND_CAMERA,
                "https://tauri.localhost/sala/ABC#x"
            ),
            Decision::Allow
        );
        // Same origin after URL parsing: host case and the default port are normalized.
        assert_eq!(
            decide(
                COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
                "HTTPS://TAURI.LOCALHOST/index.html"
            ),
            Decision::Allow
        );
        assert_eq!(
            decide(
                COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
                "https://tauri.localhost:443/"
            ),
            Decision::Allow
        );
    }

    #[test]
    fn other_kinds_are_denied() {
        for kind in [
            COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ,
            COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS,
            COREWEBVIEW2_PERMISSION_KIND_GEOLOCATION,
            COREWEBVIEW2_PERMISSION_KIND_LOCAL_FONTS,
            COREWEBVIEW2_PERMISSION_KIND_OTHER_SENSORS,
            COREWEBVIEW2_PERMISSION_KIND_MIDI_SYSTEM_EXCLUSIVE_MESSAGES,
            COREWEBVIEW2_PERMISSION_KIND_MULTIPLE_AUTOMATIC_DOWNLOADS,
            COREWEBVIEW2_PERMISSION_KIND_FILE_READ_WRITE,
            COREWEBVIEW2_PERMISSION_KIND_WINDOW_MANAGEMENT,
            COREWEBVIEW2_PERMISSION_KIND_UNKNOWN_PERMISSION,
        ] {
            assert_eq!(decide(kind, PAGE), Decision::Deny, "kind {}", kind.0);
        }
    }

    #[test]
    fn other_origins_are_denied() {
        for uri in [
            "",
            "about:blank",
            "not a url",
            "http://tauri.localhost/",
            "https://tauri.localhost:8443/",
            "https://tauri.localhost.example.com/",
            "https://example.com/",
            "https://vio-test.onrender.com/",
            "tauri://localhost/",
            "data:text/html,x",
            "https://user@tauri.localhost/",
            "https://user:pw@tauri.localhost/",
            "https://tauri.localhost@example.com/",
            "https://tauri.localhost./",
            "blob:https://tauri.localhost/0a1b2c3d",
            "file:///C:/Users/x/index.html",
        ] {
            assert_eq!(
                decide(COREWEBVIEW2_PERMISSION_KIND_MICROPHONE, uri),
                Decision::Deny,
                "{uri:?}"
            );
            assert_eq!(
                decide(COREWEBVIEW2_PERMISSION_KIND_CAMERA, uri),
                Decision::Deny,
                "{uri:?}"
            );
        }
    }

    #[test]
    fn autoplay_keeps_webview_default() {
        assert_eq!(
            decide(COREWEBVIEW2_PERMISSION_KIND_AUTOPLAY, PAGE),
            Decision::Default
        );
        assert_eq!(
            decide(
                COREWEBVIEW2_PERMISSION_KIND_AUTOPLAY,
                "https://example.com/"
            ),
            Decision::Default
        );
    }
}

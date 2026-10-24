use std::time::Duration;
use tauri::{AppHandle, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_updater::UpdaterExt;

// The window loads the hosted preview directly. It gets no IPC capability, so
// remote content cannot reach native APIs; navigation never leaves this origin.
const HOME: &str = "https://vio-test.onrender.com";

fn same_origin(url: &Url) -> bool {
    url.scheme() == "https" && url.host_str() == Some("vio-test.onrender.com") && url.port().is_none()
}

async fn update(app: &AppHandle) -> tauri_plugin_updater::Result<()> {
    let updater = app.updater_builder().timeout(Duration::from_secs(20)).build()?;
    if let Some(update) = updater.check().await? {
        // On Windows the installer closes the app and starts the new version.
        update.download_and_install(|_, _| {}, || {}).await?;
        app.restart();
    }
    Ok(())
}

fn open(app: &AppHandle) -> tauri::Result<()> {
    let home: Url = HOME.parse().expect("HOME is a valid URL");
    WebviewWindowBuilder::new(app, "main", WebviewUrl::External(home))
        .title("VIO")
        .inner_size(1280.0, 800.0)
        .min_inner_size(720.0, 480.0)
        .on_navigation(same_origin)
        .build()?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
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
        .run(tauri::generate_context!())
        .expect("VIO failed to start");
}

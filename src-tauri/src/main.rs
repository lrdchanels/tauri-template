// No console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod error;
mod files;
mod http;
mod storage;

use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

fn main() {
    let log = tauri_plugin_log::Builder::new()
        .level(log::LevelFilter::Info)
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir { file_name: None }),
            Target::new(TargetKind::Webview),
        ])
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
        .build();

    tauri::Builder::default()
        // Must be the first plugin: opening the app again focuses the running window.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(log)
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(http::Http::default())
        .manage(storage::WriteLock::default())
        // Every command the frontend can call. Add yours here and expose it in src/platform/.
        .invoke_handler(tauri::generate_handler![
            storage::storage_read,
            storage::storage_write,
            storage::storage_clear,
            storage::storage_dir,
            storage::log_dir,
            files::pick_files,
            files::open_text,
            files::save_as,
            http::http_get_json,
        ])
        .setup(|app| {
            log::info!(
                "{} {} started",
                app.package_info().name,
                app.package_info().version
            );
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the app");
}

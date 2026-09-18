mod db;
mod download;
mod lrc;
mod music;
mod progress;
mod script_engine;
mod stream_reader;
mod tag;
mod tray;

use script_engine::ScriptEngine;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let db = tauri::async_runtime::block_on(db::setup_db(app.handle()));
            app.manage(db);
            let engine = tauri::async_runtime::block_on(ScriptEngine::new());
            app.manage(engine);
            music::init_music_thread(app.handle().clone());
            tray::setup_tray(app)?;
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            music::play_music,
            music::pause_music,
            music::resume_music,
            music::stop_music,
            tag::get_album_cover,
            lrc::get_lyrics,
            music::seek_music,
            music::set_volume,
            music::set_play_mode,
            music::play_next,
            music::play_prev,
            db::add_music_files,
            db::add_music_folder,
            db::move_music,
            script_engine::init_script,
            script_engine::get_music_url,
            script_engine::get_qualities,
            download::start_download,
            music::play_online_music,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod db;
mod music;
mod tray;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let db = tauri::async_runtime::block_on(db::setup_db(app.handle()));
            music::init_music_thread(db, app.handle().clone());
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
            music::get_album_cover,
            music::seek_music,
            music::set_volume,
            music::set_play_mode,
            music::play_next,
            music::play_prev,
            db::add_music_files,
            db::add_music_folder,
            db::reorder_music,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

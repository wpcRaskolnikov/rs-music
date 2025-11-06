mod db;
mod music;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            music::init_music_thread();
            let _ = tauri::async_runtime::block_on(db::setup_db(app.handle()));
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
            db::add_music_files,
            db::add_music_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

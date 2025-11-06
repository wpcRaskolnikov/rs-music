use crate::music;
use tauri::Manager as _;

use sqlx::{migrate::MigrateDatabase, sqlite::SqlitePoolOptions, Pool, Sqlite};
type Db = Pool<Sqlite>;

pub async fn setup_db(app: &tauri::AppHandle) -> Db {
    let mut path = app.path().app_config_dir().expect("failed to get data_dir");
    match std::fs::create_dir_all(path.clone()) {
        Ok(_) => {}
        Err(err) => {
            panic!("error creating directory {}", err);
        }
    };
    path.push("db.sqlite");

    Sqlite::create_database(
        format!(
            "sqlite:{}",
            path.to_str().expect("path should be something")
        )
        .as_str(),
    )
    .await
    .expect("failed to create database");

    let db = SqlitePoolOptions::new()
        .connect(path.to_str().unwrap())
        .await
        .unwrap();

    sqlx::migrate!("./migrations").run(&db).await.unwrap();

    db
}

#[tauri::command]
pub async fn add_music_files(app_handle: tauri::AppHandle, path: Vec<String>, playlist_id: String) {
    let db = setup_db(&app_handle).await;

    for file_str in path {
        println!("Found file: {}", file_str);
        let music_metadata = music::parse_music_metadata(&file_str);
        sqlx::query(
                    "INSERT OR REPLACE INTO music (src, title, artist, album, duration, playlist_id) VALUES (?, ?, ?, ?, ?,?)"
                )
                .bind(&file_str)
                .bind(&music_metadata.title)
                .bind(&music_metadata.artist)
                .bind(&music_metadata.album)
                .bind(music_metadata.duration as i64)
                .bind(&playlist_id)
                .execute(&db)
                .await
                .unwrap();
    }
}

#[tauri::command]
pub async fn add_music_folder(app_handle: tauri::AppHandle, path: String, playlist_id: String) {
    let db = setup_db(&app_handle).await;
    let pattern = format!("{}/**/*.mp3", path);

    for entry in glob::glob(&pattern).expect("Failed to read glob pattern") {
        let path = entry.expect("Failed to match");
        let file_str = path.to_string_lossy().to_string();
        println!("Found file: {}", file_str);
        let music_metadata = music::parse_music_metadata(&file_str);

        sqlx::query(
                    "INSERT OR REPLACE INTO music (src, title, artist, album, duration, playlist_id) VALUES (?, ?, ?, ?, ?,?)"
                )
                .bind(&file_str)
                .bind(&music_metadata.title)
                .bind(&music_metadata.artist)
                .bind(&music_metadata.album)
                .bind(music_metadata.duration as i64)
                .bind(&playlist_id)
                .execute(&db)
                .await
                .unwrap();
    }
}

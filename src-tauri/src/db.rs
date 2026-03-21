use crate::tag;
use sqlx::{Pool, Sqlite, migrate::MigrateDatabase, sqlite::SqlitePoolOptions};
use tauri::Manager as _;
pub type Db = Pool<Sqlite>;

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
pub async fn add_music_files(
    db: tauri::State<'_, Db>,
    path: Vec<String>,
    playlist_id: String,
) -> Result<(), String> {
    for file_str in path {
        println!("Found file: {}", file_str);
        let music_metadata = tag::parse_music_metadata(&file_str);
        sqlx::query(
            "INSERT INTO music (src, title, artist, album, duration, playlist_id, sort_order) \
             VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM music WHERE playlist_id = ?)) \
             ON CONFLICT(playlist_id, src) DO UPDATE SET title=excluded.title, artist=excluded.artist, album=excluded.album, duration=excluded.duration"
        )
        .bind(&file_str)
        .bind(&music_metadata.title)
        .bind(&music_metadata.artist)
        .bind(&music_metadata.album)
        .bind(music_metadata.duration)
        .bind(&playlist_id)
        .bind(&playlist_id)
        .execute(&*db)
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn add_music_folder(
    db: tauri::State<'_, Db>,
    path: String,
    playlist_id: String,
) -> Result<(), String> {
    for ext in &["mp3", "flac", "wav"] {
        let pattern = format!("{}/**/*.{}", path, ext);
        for entry in glob::glob(&pattern).expect("Failed to read glob pattern") {
            let path = entry.expect("Failed to match");
            let file_str = path.to_string_lossy().to_string();
            println!("Found file: {}", file_str);
            let music_metadata = tag::parse_music_metadata(&file_str);

            sqlx::query(
                "INSERT INTO music (src, title, artist, album, duration, playlist_id, sort_order) \
                 VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM music WHERE playlist_id = ?)) \
                 ON CONFLICT(playlist_id, src) DO UPDATE SET title=excluded.title, artist=excluded.artist, album=excluded.album, duration=excluded.duration"
            )
            .bind(&file_str)
            .bind(&music_metadata.title)
            .bind(&music_metadata.artist)
            .bind(&music_metadata.album)
            .bind(music_metadata.duration as i64)
            .bind(&playlist_id)
            .bind(&playlist_id)
            .execute(&*db)
            .await
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn move_music(
    db: tauri::State<'_, Db>,
    playlist_id: String,
    from: usize,
    to: usize,
) -> Result<(), String> {
    if from == to {
        return Ok(());
    }
    let (prev, next) = get_neighbors(&*db, &playlist_id, from, to).await?;
    let mut new_order = (prev + next) / 2.0;
    if new_order == prev || new_order == next {
        rebalance(&*db, &playlist_id).await?;
        let (prev2, next2) = get_neighbors(&*db, &playlist_id, from, to).await?;
        new_order = (prev2 + next2) / 2.0;
    }

    sqlx::query(
        "UPDATE music SET sort_order = ? WHERE playlist_id = ? AND src = \
         (SELECT src FROM music WHERE playlist_id = ? ORDER BY sort_order LIMIT 1 OFFSET ?)",
    )
    .bind(new_order)
    .bind(&playlist_id)
    .bind(&playlist_id)
    .bind(from as i64)
    .execute(&*db)
    .await
    .map_err(|e| e.to_string())?;

    crate::music::move_playlist(from, to);
    Ok(())
}

async fn get_neighbors(
    db: &Db,
    playlist_id: &str,
    from: usize,
    to: usize,
) -> Result<(f64, f64), String> {
    let (prev_offset, next_offset): (i64, i64) = if from < to {
        (to as i64, to as i64 + 1)
    } else {
        (to as i64 - 1, to as i64)
    };

    let query =
        "SELECT sort_order FROM music WHERE playlist_id = ? ORDER BY sort_order LIMIT 1 OFFSET ?";

    let prev: Option<f64> = if prev_offset < 0 {
        None
    } else {
        sqlx::query_scalar(query)
            .bind(playlist_id)
            .bind(prev_offset)
            .fetch_optional(db)
            .await
            .map_err(|e| e.to_string())?
    };

    let next: Option<f64> = sqlx::query_scalar(query)
        .bind(playlist_id)
        .bind(next_offset)
        .fetch_optional(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(match (prev, next) {
        (Some(p), Some(n)) => (p, n),
        (None, Some(n)) => (n - 1.0, n), // 插到最前：虚拟前驱 = 第一项 - 1
        (Some(p), None) => (p, p + 1.0), // 插到最末：虚拟后继 = 最后项 + 1
        (None, None) => (0.0, 1.0),      // 列表为空
    })
}

async fn rebalance(db: &Db, playlist_id: &str) -> Result<(), String> {
    let srcs = sqlx::query_scalar::<_, String>(
        "SELECT src FROM music WHERE playlist_id = ? ORDER BY sort_order",
    )
    .bind(playlist_id)
    .fetch_all(db)
    .await
    .map_err(|e| e.to_string())?;

    for (i, src) in srcs.iter().enumerate() {
        sqlx::query("UPDATE music SET sort_order = ? WHERE playlist_id = ? AND src = ?")
            .bind(i as f64)
            .bind(playlist_id)
            .bind(src)
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

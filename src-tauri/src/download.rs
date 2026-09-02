use crate::db::Db;
use crate::progress::Progress;
use anyhow::Result;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use std::path::Path;
use tauri::Emitter;
use tokio::sync::mpsc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "camelCase")]
pub enum DownloadStatus {
    Ready,
    Processing(u8),
    Completed,
    Error(String),
}

async fn do_download(
    url: &str,
    save_path: &str,
    progress_tx: Option<mpsc::Sender<u8>>,
) -> Result<()> {
    let resp = reqwest::get(url).await?;
    let total_size = resp.content_length().unwrap_or(0);

    if let Some(parent) = Path::new(save_path).parent() {
        std::fs::create_dir_all(parent)?;
    }

    let mut file = File::create(save_path)?;
    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();
    let mut progress = Progress::new(total_size, progress_tx);

    while let Some(chunk) = stream.next().await {
        let bytes = chunk?;

        file.write_all(&bytes)?;
        downloaded += bytes.len() as u64;
        progress.update(downloaded);
    }

    progress.finish();

    Ok(())
}

#[tauri::command]
pub async fn start_download(
    app: tauri::AppHandle,
    db: tauri::State<'_, Db>,
    id: String,
    url: String,
    save_path: String,
) -> Result<(), String> {
    let db = db.inner().clone();

    let (progress_tx, mut progress_rx) = mpsc::channel::<u8>(32);

    tokio::spawn(async move {
        let emit = |status: DownloadStatus| {
            let _ = app.emit("download-status-update", (&id, status));
        };

        emit(DownloadStatus::Ready);

        let download_fut = do_download(&url, &save_path, Some(progress_tx));
        tokio::pin!(download_fut);

        loop {
            tokio::select! {
                Some(percent) = progress_rx.recv() => {
                    emit(DownloadStatus::Processing(percent));
                }
                res = &mut download_fut => {
                    match res {
                        Ok(()) => {
                            let _ = sqlx::query(
                                "UPDATE downloads SET status = 'completed', updated_at = datetime('now') WHERE id = ?",
                            )
                            .bind(&id)
                            .execute(&db)
                            .await;
                            emit(DownloadStatus::Completed);
                        }
                        Err(e) => {
                            let err = e.to_string();
                            eprintln!("[download] Failed: {}", err);
                            let _ = sqlx::query(
                                "UPDATE downloads SET status = ?, updated_at = datetime('now') WHERE id = ?",
                            )
                            .bind(&err)
                            .bind(&id)
                            .execute(&db)
                            .await;
                            emit(DownloadStatus::Error(err));
                        }
                    }
                    break;
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn cancel_download(db: tauri::State<'_, Db>, id: String) -> Result<(), String> {
    sqlx::query(
        "UPDATE downloads SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
    )
    .bind(&id)
    .execute(&*db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

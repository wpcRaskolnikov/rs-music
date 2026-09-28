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

async fn download_song(
    url: &str,
    save_path: &str,
    progress_tx: Option<mpsc::Sender<u8>>,
) -> Result<()> {
    let resp = reqwest::get(url).await?.error_for_status()?;

    let is_text = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|ct| ct.starts_with("text/") || ct.contains("json") || ct.contains("xml"));
    if is_text {
        return Err(anyhow::anyhow!("非音频响应"));
    }

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

async fn download_cover(url: &str) -> Result<Vec<u8>> {
    const MAX_SIZE: usize = 10 * 1024 * 1024;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("failed to build HTTP client");
    let response = client.get(url).send().await?.error_for_status()?;
    anyhow::ensure!(
        response.content_length().unwrap_or(0) <= MAX_SIZE as u64,
        "封面超过 10 MB"
    );
    let mut stream = response.bytes_stream();
    let mut bytes = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        anyhow::ensure!(bytes.len() + chunk.len() <= MAX_SIZE, "封面超过 10 MB");
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}

async fn embed_cover(save_path: String, cover_url: Option<String>) -> Result<()> {
    let url = cover_url.ok_or_else(|| anyhow::anyhow!("未获取到封面地址"))?;
    let bytes = download_cover(&url).await?;

    tokio::task::spawn_blocking(move || {
        crate::tag::embed_album_cover(Path::new(&save_path), &bytes)
    })
    .await??;

    Ok(())
}

#[tauri::command]
pub async fn start_download(
    app: tauri::AppHandle,
    db: tauri::State<'_, Db>,
    id: String,
    url: String,
    save_path: String,
    cover_url: Option<String>,
) -> Result<(), String> {
    let db = db.inner().clone();

    let (progress_tx, mut progress_rx) = mpsc::channel::<u8>(32);

    tokio::spawn(async move {
        let emit = |status: DownloadStatus| {
            let _ = app.emit(
                "download-status-update",
                serde_json::json!({
                    "id": id,
                    "status": status
                }),
            );
        };

        emit(DownloadStatus::Ready);

        let download_fut = download_song(&url, &save_path, Some(progress_tx));
        tokio::pin!(download_fut);

        loop {
            tokio::select! {
                Some(percent) = progress_rx.recv() => {
                    emit(DownloadStatus::Processing(percent));
                }
                res = &mut download_fut => {
                    match res {
                        Ok(()) => {
                            if let Err(error) = embed_cover(save_path.clone(), cover_url.clone()).await {
                                eprintln!("[download] Cover processing failed: {error}");
                            }
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

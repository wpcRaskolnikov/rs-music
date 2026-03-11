use crate::db::Db;
use crate::utils::MusicMetadata;
use base64::{Engine as _, engine::general_purpose};
use lofty::file::TaggedFileExt;
use lofty::read_from_path;
use std::sync::OnceLock;
use std::time::Duration;
use std::{
    sync::mpsc::{Receiver, RecvTimeoutError, Sender, channel},
    thread,
};
use tauri::Emitter;
use tauri_plugin_store::StoreExt;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PlayMode {
    ListLoop,
    Random,
    SingleLoop,
}

// 定义事件类型
enum MusicCommand {
    Play(String, usize),
    Pause,
    Resume,
    Stop,
    Seek(f32),
    SetVolume(f32),
    SetPlayMode(PlayMode),
    PlayNext,
    PlayPrev,
}

// 全局事件通道
static MUSIC_TX: OnceLock<Sender<MusicCommand>> = OnceLock::new();

fn play_file(sink: &rodio::Sink, path: &str) {
    sink.stop();
    match std::fs::File::open(path) {
        Err(e) => eprintln!("无法打开音频文件: {}", e),
        Ok(file) => match rodio::Decoder::try_from(file) {
            Err(e) => eprintln!("音频解码失败: {}", e),
            Ok(decoder) => {
                sink.append(decoder);
                sink.play();
            }
        },
    }
}

fn save_last_played(app: &tauri::AppHandle, playlist_id: &str, index: usize) {
    if let Ok(store) = app.store("last_played.json") {
        let _ = store.set("playlist_id", playlist_id);
        let _ = store.set("index", index);
    }
}

// 启动管理线程
pub fn init_music_thread(db: Db, app: tauri::AppHandle) {
    let (tx, rx): (Sender<MusicCommand>, Receiver<MusicCommand>) = channel();
    MUSIC_TX.set(tx).unwrap();

    thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();

        let stream_handle = rodio::OutputStreamBuilder::open_default_stream().unwrap();
        let sink = rodio::Sink::connect_new(stream_handle.mixer());

        let mut playlist: Vec<MusicMetadata> = Vec::new();
        let mut current_index: usize = 0;
        let mut current_playlist_id = String::new();

        if let Ok(store) = app.store("last_played.json") {
            let pid = store
                .get("playlist_id")
                .and_then(|v| serde_json::from_value::<String>(v).ok());
            let idx = store
                .get("index")
                .and_then(|v| serde_json::from_value::<usize>(v).ok());
            if let (Some(pid), Some(idx)) = (pid, idx) {
                let songs = rt
                    .block_on(
                        sqlx::query_as::<_, MusicMetadata>(
                            "SELECT src, title, artist, album, duration FROM music WHERE playlist_id = ?",
                        )
                        .bind(&pid)
                        .fetch_all(&db),
                    )
                    .unwrap_or_default();
                if !songs.is_empty() {
                    current_index = idx.min(songs.len() - 1);
                    current_playlist_id = pid;
                    playlist = songs;
                }
            }
        }
        let mut play_mode = if let Ok(store) = app.store("settings.json") {
            store
                .get("playMode")
                .and_then(|v| serde_json::from_value::<PlayMode>(v).ok())
                .unwrap_or(PlayMode::ListLoop)
        } else {
            PlayMode::ListLoop
        };
        let mut has_played = false;

        loop {
            let cmd = match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(cmd) => cmd,
                Err(RecvTimeoutError::Timeout) => {
                    if sink.empty() && has_played && !current_playlist_id.is_empty() {
                        current_index = match play_mode {
                            PlayMode::ListLoop => (current_index + 1) % playlist.len(),
                            PlayMode::Random => rand::random_range(0..playlist.len()),
                            PlayMode::SingleLoop => current_index,
                        };
                        play_file(&sink, &playlist[current_index].src.clone());
                        save_last_played(&app, &current_playlist_id, current_index);
                        app.emit("current-music-changed", &playlist[current_index])
                            .ok();
                    } else if !sink.empty() {
                        has_played = true;
                        if !sink.is_paused() {
                            app.emit("play-tick", sink.get_pos().as_secs_f64()).ok();
                        }
                    }
                    continue;
                }
                Err(RecvTimeoutError::Disconnected) => break,
            };

            match cmd {
                MusicCommand::Play(playlist_id, index) => {
                    if playlist_id != current_playlist_id {
                        playlist = rt
                            .block_on(
                                sqlx::query_as::<_, MusicMetadata>(
                                    "SELECT src, title, artist, album, duration FROM music WHERE playlist_id = ?",
                                )
                                .bind(&playlist_id)
                                .fetch_all(&db),
                            )
                            .unwrap_or_default();
                        current_playlist_id = playlist_id;
                    }
                    if let Some(song) = playlist.get(index) {
                        current_index = index;
                        play_file(&sink, &song.src.clone());
                        save_last_played(&app, &current_playlist_id, current_index);
                        app.emit("current-music-changed", &playlist[current_index])
                            .ok();
                    }
                }
                MusicCommand::Pause => sink.pause(),
                MusicCommand::Resume => {
                    if sink.is_paused() {
                        sink.play();
                    } else if sink.empty() && !playlist.is_empty() {
                        play_file(&sink, &playlist[current_index].src.clone());
                        app.emit("current-music-changed", &playlist[current_index])
                            .ok();
                    }
                }
                MusicCommand::Stop => sink.stop(),
                MusicCommand::Seek(value) => {
                    let _ = sink.try_seek(Duration::from_secs_f32(value));
                }
                MusicCommand::SetVolume(value) => sink.set_volume(value),
                MusicCommand::SetPlayMode(mode) => play_mode = mode,
                MusicCommand::PlayNext => {
                    if !playlist.is_empty() {
                        current_index = match play_mode {
                            PlayMode::ListLoop => (current_index + 1) % playlist.len(),
                            PlayMode::Random => rand::random_range(0..playlist.len()),
                            PlayMode::SingleLoop => current_index,
                        };
                        play_file(&sink, &playlist[current_index].src.clone());
                        save_last_played(&app, &current_playlist_id, current_index);
                        app.emit("current-music-changed", &playlist[current_index])
                            .ok();
                    }
                }
                MusicCommand::PlayPrev => {
                    if !playlist.is_empty() {
                        current_index = match play_mode {
                            PlayMode::ListLoop => {
                                (current_index + playlist.len() - 1) % playlist.len()
                            }
                            PlayMode::Random => rand::random_range(0..playlist.len()),
                            PlayMode::SingleLoop => current_index,
                        };
                        play_file(&sink, &playlist[current_index].src.clone());
                        save_last_played(&app, &current_playlist_id, current_index);
                        app.emit("current-music-changed", &playlist[current_index])
                            .ok();
                    }
                }
            }
        }
    });
}

// Tauri commands
#[tauri::command]
pub fn play_music(playlist_id: String, index: usize) {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::Play(playlist_id, index));
    }
}

#[tauri::command]
pub fn pause_music() {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::Pause);
    }
}

#[tauri::command]
pub fn resume_music() {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::Resume);
    }
}

#[tauri::command]
pub fn stop_music() {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::Stop);
    }
}

#[tauri::command]
pub fn seek_music(value: f32) {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::Seek(value));
    }
}

#[tauri::command]
pub fn set_volume(value: f32) {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::SetVolume(value));
    }
}

#[tauri::command]
pub fn get_album_cover(path: &str) -> String {
    (|| -> Result<String, Box<dyn std::error::Error>> {
        let tagged_file = read_from_path(path)?;
        let tag = tagged_file.primary_tag().ok_or("No tag")?;
        let picture = tag.pictures().get(0).ok_or("No picture")?;
        Ok(general_purpose::STANDARD.encode(picture.data()))
    })()
    .unwrap_or_default()
}

#[tauri::command]
pub fn set_play_mode(mode: PlayMode) {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::SetPlayMode(mode));
    }
}

#[tauri::command]
pub fn play_next() {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::PlayNext);
    }
}

#[tauri::command]
pub fn play_prev() {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::PlayPrev);
    }
}

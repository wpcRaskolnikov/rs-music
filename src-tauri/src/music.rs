use crate::db::Db;
use crate::tag::MusicMetadata;
use rodio::source::EmptyCallback;
use std::sync::OnceLock;
use std::time::Duration;
use std::{
    sync::mpsc::{Receiver, RecvTimeoutError, Sender, channel},
    thread,
};
use tauri::{Emitter, Manager};
use tauri_plugin_store::StoreExt;

#[derive(Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PlayMode {
    #[default]
    ListLoop,
    Random,
    SingleLoop,
}

#[derive(Clone, serde::Serialize)]
struct PlaylistEntry {
    #[serde(flatten)]
    music: MusicMetadata,
    index: usize,
    playlist_id: String,
}

#[derive(Default)]
struct Playlist {
    id: String,
    tracks: Vec<MusicMetadata>,
    current_index: usize,
    mode: PlayMode,
}

impl Playlist {
    fn is_empty(&self) -> bool {
        self.tracks.is_empty()
    }

    fn advance_next(&mut self) {
        self.current_index = match self.mode {
            PlayMode::ListLoop => (self.current_index + 1) % self.tracks.len(),
            PlayMode::Random => rand::random_range(0..self.tracks.len()),
            PlayMode::SingleLoop => self.current_index,
        };
    }

    fn advance_prev(&mut self) {
        self.current_index = match self.mode {
            PlayMode::ListLoop => (self.current_index + self.tracks.len() - 1) % self.tracks.len(),
            PlayMode::Random => rand::random_range(0..self.tracks.len()),
            PlayMode::SingleLoop => self.current_index,
        };
    }

    fn current_entry(&self) -> PlaylistEntry {
        PlaylistEntry {
            music: self.tracks[self.current_index].clone(),
            index: self.current_index,
            playlist_id: self.id.clone(),
        }
    }
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
    Move(usize, usize),
}

// 全局事件通道
static MUSIC_TX: OnceLock<Sender<MusicCommand>> = OnceLock::new();

fn load_last_played(app: &tauri::AppHandle) -> Option<(String, usize)> {
    let store = app.store("last_played.json").ok()?;
    let pid = store
        .get("playlist_id")
        .and_then(|v| serde_json::from_value::<String>(v).ok())?;
    let idx = store
        .get("index")
        .and_then(|v| serde_json::from_value::<usize>(v).ok())?;
    Some((pid, idx))
}

fn load_play_mode(app: &tauri::AppHandle) -> PlayMode {
    app.store("settings.json")
        .ok()
        .and_then(|store| {
            store
                .get("playMode")
                .and_then(|v| serde_json::from_value::<PlayMode>(v).ok())
        })
        .unwrap_or_default()
}

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

fn play_at(app: &tauri::AppHandle, sink: &rodio::Sink, entry: PlaylistEntry) {
    play_file(sink, &entry.music.src);
    if let Ok(store) = app.store("last_played.json") {
        let _ = store.set("playlist_id", entry.playlist_id.clone());
        let _ = store.set("index", entry.index);
    }
    app.emit("current-music-changed", entry).ok();
    sink.append(EmptyCallback::new(Box::new(play_next)));
}

// 启动管理线程
pub fn init_music_thread(app: tauri::AppHandle) {
    let (tx, rx): (Sender<MusicCommand>, Receiver<MusicCommand>) = channel();
    MUSIC_TX.set(tx).unwrap();

    thread::spawn(move || {
        let db = app.state::<Db>();

        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();

        let stream_handle = rodio::OutputStreamBuilder::open_default_stream().unwrap();
        let sink = rodio::Sink::connect_new(stream_handle.mixer());

        let mut playlist = Playlist::default();
        playlist.mode = load_play_mode(&app);
        if let Some((pid, idx)) = load_last_played(&app) {
            let songs = rt
                .block_on(
                    sqlx::query_as::<_, MusicMetadata>(
                        "SELECT src, title, artist, album, duration FROM music WHERE playlist_id = ? ORDER BY sort_order",
                    )
                    .bind(&pid)
                    .fetch_all(&*db),
                )
                .unwrap_or_default();
            if !songs.is_empty() {
                playlist.current_index = idx.min(songs.len() - 1);
                playlist.id = pid;
                playlist.tracks = songs;
            }
        }

        loop {
            let cmd = match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(cmd) => cmd,
                Err(RecvTimeoutError::Timeout) => {
                    if !sink.empty() && !sink.is_paused() {
                        app.emit("play-tick", sink.get_pos().as_secs_f64()).ok();
                    }
                    continue;
                }
                Err(RecvTimeoutError::Disconnected) => break,
            };

            match cmd {
                MusicCommand::Play(playlist_id, index) => {
                    if playlist_id != playlist.id {
                        playlist.tracks = rt
                            .block_on(
                                sqlx::query_as::<_, MusicMetadata>(
                                    "SELECT src, title, artist, album, duration FROM music WHERE playlist_id = ?",
                                )
                                .bind(&playlist_id)
                                .fetch_all(&*db),
                            )
                            .unwrap_or_default();
                        playlist.id = playlist_id;
                    }
                    if playlist.tracks.get(index).is_some() {
                        playlist.current_index = index;
                        play_at(&app, &sink, playlist.current_entry());
                    }
                }
                MusicCommand::Pause => sink.pause(),
                MusicCommand::Resume => {
                    if sink.is_paused() {
                        sink.play();
                    } else if sink.empty() && !playlist.is_empty() {
                        play_at(&app, &sink, playlist.current_entry());
                    }
                }
                MusicCommand::Stop => sink.stop(),
                MusicCommand::Seek(value) => {
                    let _ = sink.try_seek(Duration::from_secs_f32(value));
                }
                MusicCommand::SetVolume(value) => sink.set_volume(value),
                MusicCommand::SetPlayMode(mode) => playlist.mode = mode,
                MusicCommand::PlayNext => {
                    if !playlist.is_empty() {
                        playlist.advance_next();
                        play_at(&app, &sink, playlist.current_entry());
                    }
                }
                MusicCommand::PlayPrev => {
                    if !playlist.is_empty() {
                        playlist.advance_prev();
                        play_at(&app, &sink, playlist.current_entry());
                    }
                }
                MusicCommand::Move(from, to) => {
                    let playing_src = playlist.tracks[playlist.current_index].src.clone();
                    if from < to {
                        playlist.tracks[from..=to].rotate_left(1);
                    } else if from > to {
                        playlist.tracks[to..=from].rotate_right(1);
                    }
                    playlist.current_index = playlist
                        .tracks
                        .iter()
                        .position(|m| m.src == playing_src)
                        .unwrap_or(playlist.current_index);
                }
            }
        }
    });
}

pub fn move_playlist(from: usize, to: usize) {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::Move(from, to));
    }
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

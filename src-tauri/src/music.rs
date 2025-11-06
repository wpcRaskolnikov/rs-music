use base64::{engine::general_purpose, Engine as _};
use std::path::Path;
use std::sync::OnceLock;
use std::time::Duration;
use std::{
    sync::mpsc::{channel, Receiver, Sender},
    thread,
};

use lofty::file::TaggedFileExt;
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::read_from_path;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MusicMetadata {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: u64,
}

pub fn parse_music_metadata(path: &str) -> MusicMetadata {
    let tagged_file = Probe::open(Path::new(path))
        .expect("ERROR: Bad path provided!")
        .guess_file_type()
        .expect("ERROR: Failed to guess file type!")
        .read()
        .expect("ERROR: Failed to read file!");
    let duration = tagged_file.properties().duration().as_secs();
    let tag = tagged_file
        .primary_tag()
        .expect("ERROR: Failed to get tag!");
    return MusicMetadata {
        title: tag
            .title()
            .as_deref()
            .unwrap_or("Unknown Title")
            .to_string(),
        artist: tag
            .artist()
            .as_deref()
            .unwrap_or("Unknown Artist")
            .to_string(),
        album: tag
            .album()
            .as_deref()
            .unwrap_or("Unknown Album")
            .to_string(),
        duration,
    };
}

// 定义事件类型
enum MusicCommand {
    Play(String),
    Pause,
    Resume,
    Stop,
    Seek(f32),
    SetVolume(f32),
}

// 全局事件通道
static MUSIC_TX: OnceLock<Sender<MusicCommand>> = OnceLock::new();

// 启动管理线程
pub fn init_music_thread() {
    let (tx, rx): (Sender<MusicCommand>, Receiver<MusicCommand>) = channel();
    MUSIC_TX.set(tx).unwrap();

    thread::spawn(move || {
        let stream_handle = rodio::OutputStreamBuilder::open_default_stream().unwrap();
        let sink = rodio::Sink::connect_new(stream_handle.mixer());

        for cmd in rx {
            match cmd {
                MusicCommand::Play(path) => {
                    sink.stop();

                    let file = std::fs::File::open(path);
                    if let Err(err) = file {
                        eprintln!("无法打开音频文件: {}", err);
                        continue;
                    }
                    let file = file.unwrap();

                    let decoder = rodio::Decoder::try_from(file);
                    if let Err(err) = decoder {
                        eprintln!("音频解码失败: {}", err);
                        continue;
                    }
                    let decoder = decoder.unwrap();

                    sink.append(decoder);
                    sink.play();
                }
                MusicCommand::Pause => sink.pause(),
                MusicCommand::Resume => sink.play(),
                MusicCommand::Stop => sink.stop(),
                MusicCommand::Seek(value) => {
                    let _ = sink.try_seek(Duration::from_secs_f32(value));
                }
                MusicCommand::SetVolume(value) => sink.set_volume(value),
            }
        }
    });
}

// Tauri commands
#[tauri::command]
pub fn play_music(path: String) {
    if let Some(tx) = MUSIC_TX.get() {
        let _ = tx.send(MusicCommand::Play(path));
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

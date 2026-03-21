use base64::{Engine as _, engine::general_purpose};
use lofty::file::TaggedFileExt;
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::read_from_path;
use lofty::tag::ItemKey;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MusicMetadata {
    pub src: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: i64,
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
pub fn get_lyrics(path: &str) -> String {
    // 1. 优先读同目录下的 .lrc 文件
    let lrc_path = Path::new(path).with_extension("lrc");
    if lrc_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&lrc_path) {
            return content;
        }
    }
    // 2. 回退到音频标签中的内嵌歌词（ID3 USLT / LYRICS）
    (|| -> Result<String, Box<dyn std::error::Error>> {
        let tagged_file = read_from_path(path)?;
        let tag = tagged_file.primary_tag().ok_or("No tag")?;
        let lyrics = tag.get_string(&ItemKey::Lyrics).ok_or("No lyrics")?;
        Ok(lyrics.to_string())
    })()
    .unwrap_or_default()
}

pub fn parse_music_metadata(path: &str) -> MusicMetadata {
    let tagged_file = Probe::open(Path::new(path))
        .expect("ERROR: Bad path provided!")
        .read()
        .expect("ERROR: Failed to read file!");
    let duration = tagged_file.properties().duration().as_secs() as i64;
    let tag = tagged_file
        .primary_tag()
        .expect("ERROR: Failed to get tag!");
    return MusicMetadata {
        src: path.to_string(),
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

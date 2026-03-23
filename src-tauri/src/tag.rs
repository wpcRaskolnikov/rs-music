use base64::{Engine as _, engine::general_purpose};
use lofty::file::TaggedFileExt;
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::read_from_path;
use lofty::tag::ItemKey;
use lrc::Lyrics;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LrcLine {
    pub time: f64,
    pub content: String,
    pub translation: Option<String>,
}

fn parse_lyrics_content(content: String) -> Option<Vec<LrcLine>> {
    if content.trim().is_empty() {
        return None;
    }
    let lyrics = Lyrics::from_str(&content).ok()?;
    let timed = lyrics.get_timed_lines();
    if timed.is_empty() {
        return None;
    }
    let mut map: BTreeMap<i64, LrcLine> = BTreeMap::new();
    for (tag, text) in timed {
        let text = text.trim();
        if text.is_empty() || text == "//" {
            continue;
        }
        let entry = map.entry(tag.get_timestamp()).or_insert_with(|| LrcLine {
            time: tag.get_timestamp() as f64 / 1000.0,
            content: String::new(),
            translation: None,
        });
        if entry.content.is_empty() {
            entry.content = text.to_string();
        } else if entry.translation.is_none() {
            entry.translation = Some(text.to_string());
        }
    }
    Some(map.into_values().collect())
}

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
pub fn get_lyrics(path: &str) -> Option<Vec<LrcLine>> {
    // 1. 优先读同目录下的 .lrc 文件
    let lrc_path = Path::new(path).with_extension("lrc");
    if lrc_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&lrc_path) {
            return parse_lyrics_content(content);
        }
    }
    // 2. 回退到音频标签中的内嵌歌词（ID3 USLT / LYRICS）
    let content = (|| -> Result<String, Box<dyn std::error::Error>> {
        let tagged_file = read_from_path(path)?;
        let tag = tagged_file.primary_tag().ok_or("No tag")?;
        let lyrics = tag.get_string(&ItemKey::Lyrics).ok_or("No lyrics")?;
        Ok(lyrics.to_string())
    })()
    .ok()?;
    parse_lyrics_content(content)
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

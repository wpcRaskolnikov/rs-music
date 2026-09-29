use base64::{Engine as _, engine::general_purpose};
use lofty::config::WriteOptions;
use lofty::file::TaggedFileExt;
use lofty::picture::{Picture, PictureType};
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::read_from_path;
use lofty::tag::{Tag, TagExt};
use serde::{Deserialize, Serialize};
use std::path::Path;

pub fn embed_download_metadata(
    path: &Path,
    metadata: &MusicMetadata,
    lyrics: Option<&str>,
    cover: Option<&[u8]>,
) -> anyhow::Result<()> {
    let mut audio = Probe::open(path)?.guess_file_type()?.read()?;
    let tag_type = audio.primary_tag_type();
    if audio.primary_tag().is_none() {
        audio.insert_tag(Tag::new(tag_type));
    }
    let tag = audio.primary_tag_mut().unwrap();

    if !metadata.title.trim().is_empty() {
        tag.set_title(metadata.title.clone());
    }
    if !metadata.artist.trim().is_empty() {
        tag.set_artist(metadata.artist.clone());
    }
    if !metadata.album.trim().is_empty() {
        tag.set_album(metadata.album.clone());
    }
    if let Some(lyrics) = lyrics.filter(|lyrics| !lyrics.trim().is_empty()) {
        anyhow::ensure!(
            tag.insert_text(ItemKey::Lyrics, lyrics.to_owned()),
            "音频格式不支持内嵌歌词"
        );
    }
    if let Some(bytes) = cover {
        let mut picture = Picture::from_reader(&mut std::io::Cursor::new(bytes))?;
        picture.set_pic_type(PictureType::CoverFront);
        tag.remove_picture_type(PictureType::CoverFront);
        tag.push_picture(picture);
    }

    tag.save_to_path(path, WriteOptions::default())?;
    Ok(())
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

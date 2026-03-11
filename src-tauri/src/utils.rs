use lofty::file::TaggedFileExt;
use lofty::prelude::*;
use lofty::probe::Probe;
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


use lofty::file::TaggedFileExt;
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::read_from_path;

use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri_plugin_store::StoreExt;

#[derive(Clone, Debug, Serialize, Deserialize)]
struct MusicMetadata {
    title: String,
    artist: String,
    album: String,
    duration: u64,
}

fn parse_music_metadata(path: &str) -> MusicMetadata {
    let tagged_file = Probe::open(Path::new(path))
        .expect("ERROR: Bad path provided!")
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

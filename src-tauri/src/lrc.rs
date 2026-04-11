use lofty::file::TaggedFileExt;
use lofty::read_from_path;
use lofty::tag::ItemKey;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LrcLine {
    pub time: f64,
    pub content: String,
    pub translation: Option<String>,
}

fn split_lrc_blocks(content: &str) -> Vec<&str> {
    let timed_re = regex::Regex::new(r"(?m)^\[\d+:\d+").unwrap();
    let meta_re = regex::Regex::new(r"(?m)^\[[a-zA-Z]+:[^\]]*\]$").unwrap();
    if let Some(first_timed) = timed_re.find(content) {
        if let Some(m) = meta_re.find_at(content, first_timed.end()) {
            return vec![&content[..m.start()], &content[m.start()..]];
        }
    }
    vec![content]
}

// 支持一行多时间戳
fn parse_lrc_line(line: &str) -> Vec<(i64, &str)> {
    let re = regex::Regex::new(r"\[(\d+):(\d+(?:\.\d+)?)\]").unwrap();
    let trimmed = line.trim();
    let mut last_end = 0;
    for m in re.find_iter(trimmed) {
        if !trimmed[last_end..m.start()].trim().is_empty() {
            break;
        }
        last_end = m.end();
    }
    let text = trimmed[last_end..].trim();
    if text.is_empty() || text == "//" || last_end == 0 {
        return Vec::new();
    }
    re.captures_iter(&trimmed[..last_end])
        .filter_map(|caps| {
            let mins: i64 = caps[1].parse().ok()?;
            let secs_ms = (caps[2].parse::<f64>().ok()? * 1000.0) as i64;
            Some((mins * 60_000 + secs_ms, text))
        })
        .collect()
}

fn timed_lines(s: &str) -> Vec<(i64, &str)> {
    let mut v: Vec<_> = s.lines().flat_map(parse_lrc_line).collect();
    v.sort_by_key(|&(ms, _)| ms);
    v
}

pub fn parse_lyrics_content(content: String) -> Option<Vec<LrcLine>> {
    if content.trim().is_empty() {
        return None;
    }
    let blocks = split_lrc_blocks(&content);
    let (primary_text, secondary_text) = if blocks.len() >= 2 {
        (blocks[0], Some(blocks[1]))
    } else {
        (blocks[0], None)
    };
    let primary = timed_lines(primary_text);
    if primary.is_empty() {
        return None;
    }
    let mut map: BTreeMap<i64, LrcLine> = BTreeMap::new();
    for (ts, text) in primary {
        let entry = map.entry(ts).or_insert_with(|| LrcLine {
            time: ts as f64 / 1000.0,
            content: String::new(),
            translation: None,
        });
        if entry.content.is_empty() {
            entry.content = text.to_string();
        } else {
            entry.translation.get_or_insert_with(|| text.to_string());
        }
    }
    if let Some(sec) = secondary_text {
        // 允许双语块时间戳最多偏差 500ms
        let tol = 500;
        for (ts, text) in timed_lines(sec) {
            let left = map.range(..=ts).next_back().map(|(&k, _)| k);
            let right = map.range(ts..).next().map(|(&k, _)| k);
            let key = match (left, right) {
                (Some(l), Some(r)) => {
                    let dl = ts - l;
                    let dr = r - ts;
                    if dl <= dr {
                        (dl <= tol).then_some(l)
                    } else {
                        (dr <= tol).then_some(r)
                    }
                }
                (Some(l), None) if ts - l <= tol => Some(l),
                (None, Some(r)) if r - ts <= tol => Some(r),
                _ => None,
            };
            if let Some(k) = key {
                if let Some(e) = map.get_mut(&k) {
                    e.translation.get_or_insert_with(|| text.to_string());
                }
            }
        }
    }
    Some(map.into_values().collect()).filter(|v: &Vec<_>| !v.is_empty())
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

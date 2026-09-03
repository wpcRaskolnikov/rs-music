import { invoke } from "@tauri-apps/api/core";
import type { OnlineSongInfo } from "./musicSearch/types";

export type Quality = "128k" | "320k" | "flac" | "flac24bit" | "wav";

/**
 * 获取歌曲的真实下载链接（通过外部音源脚本）
 */
export async function getMusicUrl(
  song: OnlineSongInfo,
  script: string,
  quality: Quality = "128k",
): Promise<string> {
  return invoke<string>("get_music_url", {
    script,
    id: song.id,
    platform: song.source,
    quality,
  });
}

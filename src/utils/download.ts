import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { db } from "../store/db";

import type { OnlineSongInfo } from "./musicSearch/types";

export type Quality = "128k" | "320k" | "flac" | "flac24bit";

export interface DownloadTask {
  id: string;
  platform: string;
  title: string;
  artist: string;
  album: string;
  quality: string;
  url: string;
  status: string;
}

const extMap: Record<string, string> = {
  flac: "flac",
  flac24bit: "flac",
  wav: "wav",
  "320k": "mp3",
  "128k": "mp3",
};

/**
 * 获取歌曲的真实下载链接（通过外部音源脚本）
 */
export async function getMusicUrl(
  script: string,
  source: string,
  songId: string,
  quality: Quality = "320k",
): Promise<string> {
  return invoke<string>("get_music_url", {
    script,
    id: songId,
    platform: source,
    quality,
  });
}

/**
 * 创建下载任务记录（前端直接写DB）
 */
export async function createDownloadTask(params: {
  id: string;
  title: string;
  artist: string;
  album: string;
  platform: string;
  quality: Quality;
  url: string;
  status?: string;
}): Promise<void> {
  await db.execute(
    "INSERT OR REPLACE INTO downloads (id, platform, title, artist, album, quality, url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      params.id,
      params.platform,
      params.title,
      params.artist,
      params.album,
      params.quality,
      params.url,
      params.status ?? "pending",
    ],
  );
}

/**
 * 开始下载
 */
export async function startDownload(params: {
  id: string;
  url: string;
  savePath: string;
}): Promise<void> {
  return invoke("start_download", {
    id: params.id,
    url: params.url,
    savePath: params.savePath,
  });
}

/**
 * 便捷函数：创建任务并开始下载
 */
export async function downloadSong(
  script: string,
  song: OnlineSongInfo,
  quality: Quality = "320k",
  saveDir: string,
): Promise<string> {
  const url = await getMusicUrl(script, song.src, song.id, quality);
  const id = `${song.id}_${quality}`;
  const ext = extMap[quality] ?? "mp3";
  const fileName = `${song.title} - ${song.artist}.${ext}`;
  const savePath = `${saveDir}/${fileName}`;

  await createDownloadTask({
    id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    platform: song.src,
    quality,
    url,
  });
  await startDownload({
    id,
    url,
    savePath,
  });
  return id;
}

/**
 * 取消下载
 */
export async function cancelDownload(id: string): Promise<void> {
  return invoke("cancel_download", { id });
}

/**
 * 监听下载状态更新
 */
export type DownloadStatusEvent =
  | { type: "ready"; data: null }
  | { type: "processing"; data: number }
  | { type: "completed"; data: null }
  | { type: "error"; data: string };

export type DownloadStatusPayload = { id: string; status: DownloadStatusEvent };

export function onDownloadStatusUpdate(
  handler: (payload: DownloadStatusPayload) => void,
): Promise<UnlistenFn> {
  return listen("download-status-update", (event) => {
    const [id, status] = event.payload as [string, DownloadStatusEvent];
    handler({ id, status });
  });
}

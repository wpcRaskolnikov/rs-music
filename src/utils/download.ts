import { invoke } from "@tauri-apps/api/core";
import { getDefaultStore } from "jotai";
import { db, downloadsAtom, type DownloadTask } from "../store";

import type { OnlineSongInfo } from "./musicSearch/types";

export type Quality = "128k" | "192k" | "320k" | "flac" | "flac24bit";

const extMap: Record<string, string> = {
  "flac": "flac",
  "flac24bit": "flac",
  "320k": "mp3",
  "192k": "mp3",
  "128k": "mp3",
};

export async function downloadSong(
  song: OnlineSongInfo,
  quality: Quality = "320k",
  saveDir: string,
): Promise<string> {
  const url = await invoke<string>("get_music_url", {
    id: song.id,
    platform: song.src,
    quality,
  });
  const id = `${song.id}_${quality}`;
  const ext = extMap[quality] ?? "mp3";
  const fileName = `${song.title} - ${song.artist}.${ext}`;
  const savePath = `${saveDir}/${fileName}`;

  await db.execute(
    "INSERT OR REPLACE INTO downloads (id, platform, title, artist, album, quality, url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      song.src,
      song.title,
      song.artist,
      song.album,
      quality,
      url,
      "ready",
    ],
  );

  const task: DownloadTask = {
    id,
    platform: song.src,
    title: song.title,
    artist: song.artist,
    album: song.album,
    quality,
    url,
    status: "ready",
  };
  getDefaultStore().set(downloadsAtom, (prev) => [task, ...prev]);

  await invoke("start_download", {
    id,
    url,
    savePath,
  });
  return id;
}

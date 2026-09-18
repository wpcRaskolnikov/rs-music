import Database from "@tauri-apps/plugin-sql";
import { atom } from "jotai";

export const db = await Database.load("sqlite:db.sqlite");

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

export const downloadsAtom = atom<DownloadTask[]>([]);

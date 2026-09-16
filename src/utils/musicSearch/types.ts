import type { MusicMetadata } from "../../store";

export type Source = "kw" | "kg" | "tx" | "wy" | "mg";

export const sourceNameMap: Record<Source, string> = {
  kw: "酷我",
  kg: "酷狗",
  tx: "QQ音乐",
  wy: "网易云",
  mg: "咪咕",
};

export interface OnlineSongInfo extends MusicMetadata {
  id: string;
}

export interface PlatformResult {
  source: Source;
  sourceName: string;
  songs: OnlineSongInfo[];
  total: number;
  error?: string;
}

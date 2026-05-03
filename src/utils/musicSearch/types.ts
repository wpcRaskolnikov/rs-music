export type Source = "kw" | "kg" | "qq" | "wy" | "mg";

export const sourceNameMap: Record<Source, string> = {
  kw: "酷我",
  kg: "酷狗",
  qq: "QQ音乐",
  wy: "网易云",
  mg: "咪咕",
};

export interface OnlineSongInfo {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration: number;
  source: Source;
}

export interface PlatformResult {
  source: Source;
  sourceName: string;
  songs: OnlineSongInfo[];
  total: number;
  error?: string;
}

import type { MusicMetadata } from "../../store";

export type Source = "kw" | "kg" | "tx" | "wy" | "mg";

export interface OnlineSongInfo extends MusicMetadata {
  id: string;
}

export interface SearchResult {
  songs: OnlineSongInfo[];
  total: number;
}

export interface LyricInfo {
  lyric: string;
  tlyric?: string;
  rlyric?: string;
  lxlyric?: string;
}

export interface MusicProvider {
  name: string;
  search: (keyword: string, page: number) => Promise<SearchResult>;
  getCoverUrl: (id: string) => Promise<string>;
  getLyric: (id: string) => Promise<LyricInfo | null>;
}

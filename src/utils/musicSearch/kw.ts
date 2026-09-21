import type {
  MusicProvider,
  SearchResult,
  OnlineSongInfo,
  LyricInfo,
} from "./types";
import { fetch } from "@tauri-apps/plugin-http";
import { kwLyricParam } from "../crypto";

export const kwProvider: MusicProvider = {
  name: "酷我",
  search: async (keyword, page = 1, limit = 50): Promise<SearchResult> => {
    const url = new URL("http://search.kuwo.cn/r.s");
    url.search = new URLSearchParams({
      all: keyword,
      pn: String(page - 1),
      rn: String(limit),
      mobi: "1",
      vipver: "1",
      show_copyright_off: "1",
      ft: "music",
      rformat: "json",
      encoding: "utf8",
      vermerge: "1",
    }).toString();

    try {
      const resp = await fetch(url);
      const text = await resp.text();
      const result = JSON.parse(text);

      if (!result || (result.TOTAL !== "0" && result.SHOW === "0")) {
        return { songs: [], total: 0 };
      }

      const songs = handleResult(result.abslist);
      return { songs, total: parseInt(result.TOTAL) };
    } catch {
      return { songs: [], total: 0 };
    }
  },

  getCoverUrl: async (id: string): Promise<string> => {
    const url = new URL("http://artistpicserver.kuwo.cn/pic.web");
    url.search = new URLSearchParams({
      corp: "kuwo",
      type: "rid_pic",
      pictype: "500",
      size: "500",
      rid: id,
    }).toString();

    try {
      const resp = await fetch(url);
      const text = await resp.text();
      if (/^https?:/.test(text)) return text.trim();
      throw new Error("获取封面失败");
    } catch (e) {
      console.error("kw getCoverUrl error:", e);
      throw e;
    }
  },

  getLyric: async (id: string): Promise<LyricInfo | null> => {
    const param = kwLyricParam(id, true);
    const url = `http://newlyric.kuwo.cn/newlyric.lrc?${param}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;

    const raw = await resp.arrayBuffer();
    const bytes = new Uint8Array(raw);

    try {
      const decodedText = kwXorDecode(bytes);
      return { lyric: decodedText, tlyric: "", rlyric: "", lxlyric: "" };
    } catch {
      return null;
    }
  },
};

function handleResult(rawData: any[]): OnlineSongInfo[] {
  if (!rawData) return [];
  const result: OnlineSongInfo[] = [];
  for (const info of rawData) {
    if (!info.N_MINFO) continue;
    const songId = info.MUSICRID?.replace("MUSIC_", "");
    if (!songId) continue;
    const interval = parseInt(info.DURATION);
    result.push({
      id: songId,
      src: "kw",
      title: info.SONGNAME || "",
      artist: info.ARTIST?.replace(/\&/g, "、") || "",
      album: info.ALBUM || "",
      duration: isNaN(interval) ? 0 : interval,
    });
  }
  return result;
}

function kwXorDecode(bytes: Uint8Array): string {
  const key = new TextEncoder().encode("yeelion");
  const output = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    output[i] = key[i % key.length] ^ bytes[i];
  }
  return new TextDecoder().decode(output);
}

import type { MusicProvider, SearchResult, OnlineSongInfo, LyricInfo } from "./types";
import { fetch } from "@tauri-apps/plugin-http";
import { aesEcbEncrypt, md5 } from "../crypto";

export const LIMIT = 20;
const EAPI_KEY = "e82ckenh8dichen8";

function getSinger(singers: any[]): string {
  return singers.filter((s: any) => s.name).map((s: any) => s.name).join("、");
}

function eapi(url: string, object: Record<string, any>): { params: string } {
  const text = JSON.stringify(object);
  const message = `nobody${url}use${text}md5forencrypt`;
  const digest = md5(message);
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
  return { params: aesEcbEncrypt(data, EAPI_KEY) };
}

function handleResult(rawList: any[]): OnlineSongInfo[] {
  if (!rawList) return [];
  return rawList
    .map((item) => {
      if (!item.baseInfo?.simpleSongData) return null;
      const song = item.baseInfo.simpleSongData;
      return {
        id: String(song.id || ""),
        src: "wy",
        title: song.name || "",
        artist: getSinger(song.ar || []),
        album: song.al?.name || "",
        duration: Math.round((song.dt || 0) / 1000),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

function fixTimeLabel(lrc: string): string {
  return lrc.replace(/\[(\d{2}:\d{2}):(\d{2})]/g, "[$1.$2]");
}

function parseYrc(yrc: string): { lxlyric: string } | null {
  if (!yrc) return null;
  const lines = yrc.split("\n");
  const lrcLines: string[] = [];
  const lxLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(/^\[(\d+),\d+\]/);
    if (!m) continue;

    const startMs = parseInt(m[1]);
    const ms = startMs % 1000;
    const s = Math.floor(startMs / 1000) % 60;
    const mi = Math.floor(startMs / 60000);
    const timeTag = `[${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}]`;

    const words = trimmed.replace(/^\[\d+,\d+\]/, "");
    const text = words.replace(/\(\d+,\d+,\d+\)/g, "");
    lrcLines.push(`${timeTag}${text}`);

    const timeMatches = words.matchAll(/\((\d+),(\d+),\d+\)/g);
    const wordParts = words.split(/\(\d+,\d+,\d+\)/);
    wordParts.shift();
    const wordTimes: string[] = [];
    for (const tm of timeMatches) {
      const t = parseInt(tm[1]) - startMs;
      wordTimes.push(`<${Math.max(t, 0)},${tm[2]}>`);
    }
    const lxWord = wordTimes.map((t, i) => `${t}${wordParts[i] ?? ""}`).join("");
    lxLines.push(`${timeTag}${lxWord}`);
  }

  if (!lrcLines.length) return null;
  return { lxlyric: lxLines.join("\n") };
}

export const wyProvider: MusicProvider = {
  name: "网易云",

  search: async (keyword, page = 1, limit = 20): Promise<SearchResult> => {
    try {
      const url = "/api/search/song/list/page";
      const data = {
        keyword,
        needCorrect: "1",
        channel: "typing",
        offset: limit * (page - 1),
        scene: "normal",
        total: page === 1,
        limit,
      };

      const encryptedData = eapi(url, data);
      const formData = new URLSearchParams();
      formData.set("params", encryptedData.params);

      const resp = await fetch("http://interface.music.163.com/eapi/batch", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const result = await resp.json();
      if (!result || result.code !== 200) {
        return { songs: [], total: 0 };
      }

      const songs = handleResult(result.data?.resources || []);
      const total = Math.min(result.data?.totalCount || 0, 300);
      return { songs, total };
    } catch (e) {
      return { songs: [], total: 0 };
    }
  },

  getCoverUrl: async (id: string): Promise<string> => {
    try {
      const resp = await fetch("http://music.163.com/api/song/detail/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: "https://music.163.com",
        },
        body: `ids=[${id}]`,
      });

      const result = await resp.json();
      if (!result.songs?.length) throw new Error("获取封面失败");
      return result.songs[0].album?.picUrl ?? "";
    } catch (e) {
      console.error("wy getCoverUrl error:", e);
      throw e;
    }
  },

  getLyric: async (id: string): Promise<LyricInfo | null> => {
    const url = "/api/song/lyric/v1";
    const data = {
      id: Number(id),
      cp: false,
      tv: 0,
      lv: 0,
      rv: 0,
      kv: 0,
      yv: 0,
      ytv: 0,
      yrv: 0,
    };

    const encryptedData = eapi(url, data);
    const formData = new URLSearchParams();
    formData.set("params", encryptedData.params);

    const resp = await fetch("https://interface3.music.163.com/eapi/song/lyric/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36",
        Referer: "https://music.163.com",
      },
      body: formData.toString(),
    });

    const body = await resp.json();
    if (body.code !== 200 || !body?.lrc?.lyric) return null;

    const lrc = fixTimeLabel(body.lrc.lyric);
    const tlyric = body.tlyric?.lyric ? fixTimeLabel(body.tlyric.lyric) : "";
    const romalrc = body.romalrc?.lyric ? fixTimeLabel(body.romalrc.lyric) : "";
    const yrc = body.yrc?.lyric ? parseYrc(body.yrc.lyric) : null;

    return {
      lyric: lrc,
      tlyric,
      rlyric: romalrc,
      lxlyric: yrc?.lxlyric ?? "",
    };
  },
};

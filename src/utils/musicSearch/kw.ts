import { combineLrc } from "../index";
import type { MusicProvider, SearchResult, OnlineSongInfo } from "./types";
import { fetch } from "@tauri-apps/plugin-http";
import {
  base64Encode,
  base64Decode,
  xorEncode,
  deflateDecode,
} from "../crypto";

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

      const songs = handleSearchResult(result.abslist);
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

  getLyric: async (id: string): Promise<string | null> => {
    const params = new URLSearchParams({
      user: "12345,web,web,web",
      requester: "localhost",
      req: "1",
      rid: `MUSIC_${id}`,
      lrcx: "1",
    }).toString();
    const encoder = new TextEncoder();
    const param = base64Encode(
      xorEncode(encoder.encode(params), encoder.encode("yeelion")),
    );

    try {
      const resp = await fetch(`http://newlyric.kuwo.cn/newlyric.lrc?${param}`);
      if (!resp.ok) return null;
      return parseLyric(await decodeLyric(await resp.arrayBuffer()));
    } catch {
      return null;
    }
  },
};

function handleSearchResult(rawData: any[]): OnlineSongInfo[] {
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

async function decodeLyric(raw: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder();
  const bytes = new Uint8Array(raw);
  if (decoder.decode(bytes.subarray(0, 10)) !== "tp=content") {
    throw new Error("Invalid Kuwo lyric response");
  }

  // find “\r\n\r\n”
  const end = bytes.findIndex(
    (byte, i) =>
      byte === 13 &&
      bytes[i + 1] === 10 &&
      bytes[i + 2] === 13 &&
      bytes[i + 3] === 10,
  );
  if (end < 0) throw new Error("Missing Kuwo lyric header");

  const header = decoder.decode(bytes.subarray(0, end));
  let data = await deflateDecode(bytes.subarray(end + 4));

  if (!/(?:^|\r\n)lrcx=0(?:\r\n|$)/.test(header)) {
    const decoded = base64Decode(decoder.decode(data));
    const key = new TextEncoder().encode("yeelion");
    data = xorEncode(decoded, key);
  }
  return new TextDecoder("gb18030").decode(data);
}

function parseLyric(text: string): string | null {
  interface Line {
    time: string;
    text: string;
  }

  const LRC_LINE_REGEX = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;
  const TAG_REGEX = /^\[(ver|ti|ar|al|offset|by|kuwo):.*\]$/;
  const WORD_TIMING_REGEX = /<-?\d+,-?\d+(?:,-?\d+)?>/g;

  const tags: string[] = [];
  const lines: Line[] = [];
  const translations: Line[] = [];
  const times = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = LRC_LINE_REGEX.exec(line);
    if (!match) {
      if (TAG_REGEX.test(line)) tags.push(line);
      continue;
    }

    const [, min, sec, ms = "", content] = match;
    const time = `${min.padStart(2, "0")}:${sec}.${ms.padEnd(3, "0")}`;
    const cleanText = content.trim();

    // 酷我交错格式：[t1]原文1、[t2]译文1、[t2]原文2。
    if (times.has(time)) {
      if (lines.length >= 2) {
        const trans = lines.pop()!;
        trans.time = lines[lines.length - 1].time;
        translations.push(trans);
      }
    } else {
      times.add(time);
    }
    lines.push({ time, text: cleanText });
  }

  if (!lines.length) return null;

  const format = (items: Line[]) =>
    [
      ...tags,
      ...items.map(
        ({ time, text }) => `[${time}]${text.replace(WORD_TIMING_REGEX, "")}`,
      ),
    ].join("\n");

  const lyric = format(lines);
  const translation = translations.length ? format(translations) : "";
  return combineLrc(lyric, translation);
}

import type { PlatformResult, OnlineSongInfo } from "./types";
import type { Source } from "./types";
import { fetch } from "@tauri-apps/plugin-http";

const source: Source = "kw";
const sourceName = "酷我";

export async function search(
  keyword: string,
  page = 1,
  limit = 50,
): Promise<PlatformResult> {
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
      return { source, sourceName, songs: [], total: 0, error: "搜索失败" };
    }

    const songs = handleResult(result.abslist);
    const total = parseInt(result.TOTAL);

    return { source, sourceName, songs, total };
  } catch (e) {
    return {
      source,
      sourceName,
      songs: [],
      total: 0,
      error: (e as Error).message,
    };
  }
}

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
      name: info.SONGNAME || "",
      artist: info.ARTIST?.replace(/\&/g, "、") || "",
      album: info.ALBUM || "",
      duration: isNaN(interval) ? 0 : interval,
      source: "kw",
    });
  }

  return result;
}

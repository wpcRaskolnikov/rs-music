import type { PlatformResult, OnlineSongInfo } from "./types";
import type { Source } from "./types";
import { fetch } from "@tauri-apps/plugin-http";

const source: Source = "kg";
const sourceName = "酷狗";

function formatSingerName(singers: any[]): string {
  if (Array.isArray(singers)) {
    return singers
      .map((s) => s.name ?? "")
      .filter(Boolean)
      .join("、");
  }
  return "";
}

async function doSearch(
  keyword: string,
  page: number,
  pagesize: number,
): Promise<{ lists: any[]; total: number; errorCode: number | null }> {
  const url = new URL("https://songsearch.kugou.com/song_search_v2");
  url.search = new URLSearchParams({
    keyword,
    page: String(page),
    pagesize: String(pagesize),
    platform: "WebFilter",
    iscorrection: "1",
  }).toString();

  const resp = await fetch(url);
  const text = await resp.text();
  const result = JSON.parse(text);

  if (!result || result.error_code !== 0) {
    return { lists: [], total: 0, errorCode: result?.error_code ?? -1 };
  }
  return {
    lists: result.data?.lists || [],
    total: result.data?.total || 0,
    errorCode: null,
  };
}

function fail(msg = "搜索失败"): PlatformResult {
  return { source, sourceName, songs: [], total: 0, error: msg };
}

export async function search(
  keyword: string,
  page = 1,
  limit = 50,
): Promise<PlatformResult> {
  const { lists, total, errorCode } = await doSearch(keyword, page, limit);
  if (errorCode !== null) {
    if (errorCode === 149 && page > 1)
      return searchLastPage(keyword, page, limit);
    return fail();
  }
  return { source, sourceName, songs: handleResult(lists), total };
}

async function searchLastPage(
  keyword: string,
  page: number,
  limit: number,
): Promise<PlatformResult> {
  const { total, errorCode } = await doSearch(keyword, 1, 1);
  if (errorCode !== null) return fail();

  const offset = (page - 1) * limit;
  const remaining = total - offset;
  if (remaining <= 0) return { source, sourceName, songs: [], total };

  const newPage = Math.floor(offset / remaining) + 1;
  const { lists, errorCode: err2 } = await doSearch(
    keyword,
    newPage,
    remaining,
  );
  if (err2 !== null) return fail();
  return { source, sourceName, songs: handleResult(lists), total };
}

function handleResult(rawData: any[]): OnlineSongInfo[] {
  const ids = new Set<string>();
  const list: OnlineSongInfo[] = [];

  for (const item of rawData) {
    const key = `${item.Audioid}${item.FileHash}`;
    if (ids.has(key)) continue;
    ids.add(key);
    list.push({
      id: `${item.Audioid || ""}_${item.FileHash || ""}`,
      name: item.SongName || "",
      artist: formatSingerName(item.Singers),
      album: item.AlbumName || "",
      duration: item.Duration || 0,
      source: "kg",
    });
  }
  return list;
}

import type { PlatformResult, OnlineSongInfo } from "./types";
import type { Source } from "./types";
import { fetch } from "@tauri-apps/plugin-http";
import { md5 } from "../crypto";

const source: Source = "mg";
const sourceName = "咪咕";
const DEVICE_ID = "963B7AA0D21511ED807EE5846EC87D20";
const SIGNATURE_MD5 = "6cdc72a439cef99a3418d2a78aa28c73";

function formatSingerName(singers: any[]): string {
  if (Array.isArray(singers)) {
    return singers
      .map((s) => s.name ?? "")
      .filter(Boolean)
      .join("、");
  }
  return "";
}

function createSignature(time: string, str: string) {
  const sign = md5(
    `${str}${SIGNATURE_MD5}yyapp2d16148780a1dcc7408e06336b98cfd50${DEVICE_ID}${time}`,
  );
  return { sign, deviceId: DEVICE_ID };
}

export async function search(
  keyword: string,
  page = 1,
  limit = 50,
): Promise<PlatformResult> {
  try {
    const time = Date.now().toString();
    const signData = createSignature(time, keyword);
    const searchSwitch = encodeURIComponent(JSON.stringify({ song: 1 }));

    const url = new URL(
      "https://jadeite.migu.cn/music_search/v3/search/searchAll",
    );
    url.search = new URLSearchParams({
      isCorrect: "0",
      isCopyright: "1",
      searchSwitch,
      pageSize: String(limit),
      text: keyword,
      pageNo: String(page),
      sort: "0",
      sid: "USS",
    }).toString();

    const resp = await fetch(url, {
      headers: {
        uiVersion: "A_music_3.6.1",
        deviceId: signData.deviceId,
        timestamp: time,
        sign: signData.sign,
      },
    });
    const text = await resp.text();
    const result = JSON.parse(text);

    if (!result || result.code !== "000000") {
      return {
        source,
        sourceName,
        songs: [],
        total: 0,
        error: result?.info || "搜索失败",
      };
    }

    const songResultData = result.songResultData || {
      resultList: [],
      totalCount: 0,
    };
    const songs = filterData(songResultData.resultList || []);
    const total = songResultData.totalCount || 0;

    return { source, sourceName, songs: songs ?? [], total };
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

function filterData(rawData: any[][]): OnlineSongInfo[] | null {
  const list: OnlineSongInfo[] = [];
  const ids = new Set<string>();

  for (const itemArr of rawData) {
    for (const data of itemArr) {
      if (!data.songId || !data.copyrightId || ids.has(data.copyrightId))
        continue;
      ids.add(data.copyrightId);

      list.push({
        id: data.copyrightId,
        name: data.name || "",
        artist: formatSingerName(data.singerList),
        album: data.album || "",
        duration: data.duration || 0,
        source: "mg",
      });
    }
  }

  return list;
}

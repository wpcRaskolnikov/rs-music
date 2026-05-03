import type { PlatformResult, OnlineSongInfo } from "./types";
import type { Source } from "./types";
import { fetch } from "@tauri-apps/plugin-http";
import { aesEcbEncrypt, md5 } from "../crypto";

const source: Source = "wy";
const sourceName = "网易云";
const EAPI_KEY = "e82ckenh8dichen8";

function getSinger(singers: any[]): string {
  const arr: string[] = [];
  singers.forEach((singer) => {
    if (singer.name) arr.push(singer.name);
  });
  return arr.join("、");
}

function eapi(url: string, object: Record<string, any>): { params: string } {
  const text = JSON.stringify(object);
  const message = `nobody${url}use${text}md5forencrypt`;
  const digest = md5(message);
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
  return {
    params: aesEcbEncrypt(data, EAPI_KEY),
  };
}

export const LIMIT = 20;

export async function search(
  keyword: string,
  page = 1,
  limit = LIMIT,
): Promise<PlatformResult> {
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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await resp.json();
    if (!result || result.code !== 200) {
      return { source, sourceName, songs: [], total: 0, error: "搜索失败" };
    }

    const songs = handleResult(result.data?.resources || []);
    const total = Math.min(result.data?.totalCount || 0, 300);
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

function handleResult(rawList: any[]): OnlineSongInfo[] {
  if (!rawList) return [];

  return rawList
    .map((item) => {
      if (!item.baseInfo?.simpleSongData) return null;
      const song = item.baseInfo.simpleSongData;

      return {
        id: String(song.id || ""),
        name: song.name || "",
        artist: getSinger(song.ar || []),
        album: song.al?.name || "",
        duration: Math.round((song.dt || 0) / 1000),
        source: "wy" as Source,
      };
    })
    .filter((s): s is OnlineSongInfo => s !== null);
}

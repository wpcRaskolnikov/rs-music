import type { MusicProvider, SearchResult, OnlineSongInfo, LyricInfo } from "./types";
import { fetch } from "@tauri-apps/plugin-http";
import { md5 } from "../crypto";
import { formatSingerName } from "../index";

const DEVICE_ID = "963B7AA0D21511ED807EE5846EC87D20";
const SIGNATURE_MD5 = "6cdc72a439cef99a3418d2a78aa28c73";

function createSignature(time: string, str: string) {
  const sign = md5(
    `${str}${SIGNATURE_MD5}yyapp2d16148780a1dcc7408e06336b98cfd50${DEVICE_ID}${time}`,
  );
  return { sign, deviceId: DEVICE_ID };
}

async function getMgSongInfo(
  copyrightId: string,
): Promise<{ lrcUrl?: string; mrcUrl?: string; trcUrl?: string } | null> {
  const time = Date.now().toString();
  const text = `copyrightId=${copyrightId}`;
  const signData = createSignature(time, text);

  const resp = await fetch(
    `https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/resourceinfo.do?${text}&resourceType=2`,
    {
      headers: {
        uiVersion: "A_music_3.6.1",
        deviceId: signData.deviceId,
        timestamp: time,
        sign: signData.sign,
      },
    },
  );

  if (!resp.ok) return null;
  const body = await resp.json();
  if (body.code !== "000000" || !body.resource?.length) return null;

  const song = body.resource[0];
  return {
    lrcUrl: song.lrcUrl || song.lrcURL,
    mrcUrl: song.mrcUrl || song.mrcURL,
    trcUrl: song.trcUrl || song.trcURL,
  };
}

function filterData(rawData: any[][]): OnlineSongInfo[] {
  const list: OnlineSongInfo[] = [];
  const ids = new Set<string>();

  for (const itemArr of rawData) {
    for (const data of itemArr) {
      if (!data.songId || !data.copyrightId || ids.has(data.copyrightId)) continue;
      ids.add(data.copyrightId);
      list.push({
        id: data.songId,
        src: "mg",
        title: data.name || "",
        artist: formatSingerName(data.singerList),
        album: data.album || "",
        duration: data.duration || 0,
      });
    }
  }
  return list;
}

export const mgProvider: MusicProvider = {
  name: "咪咕",

  search: async (keyword, page = 1, limit = 50): Promise<SearchResult> => {
    try {
      const time = Date.now().toString();
      const signData = createSignature(time, keyword);
      const searchSwitch = encodeURIComponent(JSON.stringify({ song: 1 }));

      const url = new URL("https://jadeite.migu.cn/music_search/v3/search/searchAll");
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
        return { songs: [], total: 0 };
      }

      const songResultData = result.songResultData || { resultList: [], totalCount: 0 };
      const songs = filterData(songResultData.resultList || []);
      const total = songResultData.totalCount || 0;
      return { songs, total };
    } catch (e) {
      return { songs: [], total: 0 };
    }
  },

  getCoverUrl: async (id: string): Promise<string> => {
    const resp = await fetch(
      `http://music.migu.cn/v3/api/music/audioPlayer/getSongPic?songId=${id}`,
      { headers: { Referer: "http://music.migu.cn/v3/music/player/audio?from=migu" } },
    );
    const body = await resp.json();
    if (body.returnCode !== "000000") throw new Error("获取封面失败");
    let url = body.largePic || body.mediumPic || body.smallPic;
    if (!url) throw new Error("获取封面失败");
    if (!/^https?:/.test(url)) url = "https:" + url;
    return url;
  },

  getLyric: async (id: string): Promise<LyricInfo | null> => {
    const info = await getMgSongInfo(id);
    if (!info || !info.lrcUrl) return null;

    try {
      const resp = await fetch(info.lrcUrl, {
        headers: {
          Referer: "https://app.c.nf.migu.cn/",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 5.1.1; Nexus 6 Build/LYZ28E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Mobile Safari/537.36",
          channel: "0146921",
        },
      });
      if (!resp.ok) return null;
      const text = await resp.text();

      let tlyric = "";
      if (info.trcUrl) {
        try {
          const tr = await fetch(info.trcUrl, {
            headers: {
              Referer: "https://app.c.nf.migu.cn/",
              "User-Agent":
                "Mozilla/5.0 (Linux; Android 5.1.1; Nexus 6 Build/LYZ28E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Mobile Safari/537.36",
              channel: "0146921",
            },
          });
          if (tr.ok) tlyric = await tr.text();
        } catch { /* ignore */ }
      }

      return { lyric: text, tlyric, rlyric: "", lxlyric: "" };
    } catch {
      return null;
    }
  },
};

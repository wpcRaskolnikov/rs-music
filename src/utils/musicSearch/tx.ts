import type {
  MusicProvider,
  SearchResult,
  OnlineSongInfo,
  LyricInfo,
} from "./types";
import { fetch } from "@tauri-apps/plugin-http";
import { sha1, base64Encode } from "../crypto";
import { formatSingerName } from "../index";

const PART_1_INDEXES = [23, 14, 6, 36, 16, 40, 7, 19];
const PART_2_INDEXES = [16, 1, 32, 12, 19, 27, 8, 5];
const SCRAMBLE_VALUES = [
  89, 39, 179, 150, 218, 82, 58, 252, 177, 52, 186, 123, 120, 64, 242, 133, 143,
  161, 121, 179,
];

async function zzcSign(text: string): Promise<string> {
  const hash = await sha1(text);
  const part1 = PART_1_INDEXES.map((idx) => hash[idx]).join("");
  const part2 = PART_2_INDEXES.map((idx) => hash[idx]).join("");
  const part3 = SCRAMBLE_VALUES.map(
    (value, i) => value ^ parseInt(hash.slice(i * 2, i * 2 + 2), 16),
  );
  const b64Part = base64Encode(new Uint8Array(part3)).replace(/[\/+=]/g, "");
  return `zzc${part1}${b64Part}${part2}`.toLowerCase();
}

async function getSongInfo(
  mid: string,
): Promise<{ albumMid?: string; songId?: number }> {
  const data = {
    comm: { ct: "19", cv: "1859", uin: "0" },
    req: {
      module: "music.pf_song_detail_svr",
      method: "get_song_detail_yqq",
      param: { song_mid: mid, song_type: 0 },
    },
  };
  const sign = await zzcSign(JSON.stringify(data));
  const resp = await fetch(
    `https://u.y.qq.com/cgi-bin/musics.fcg?sign=${sign}`,
    { method: "POST", body: JSON.stringify(data) },
  );
  const body = await resp.json();
  if (body.code !== 0 || body.req?.code !== 0) return {};
  const track = body.req.data?.track_info;
  return {
    albumMid: track?.album?.pmid ?? "",
    songId: track?.id ?? 0,
  };
}

async function parseTxLyric(
  lrc: string,
  tlrc: string,
  rlrc: string,
): Promise<LyricInfo> {
  try {
    return {
      lyric: atob(lrc || ""),
      tlyric: tlrc ? atob(tlrc) : "",
      rlyric: rlrc ? atob(rlrc) : "",
      lxlyric: "",
    };
  } catch {
    return {
      lyric: lrc || "",
      tlyric: tlrc || "",
      rlyric: rlrc || "",
      lxlyric: "",
    };
  }
}

export const txProvider: MusicProvider = {
  name: "QQ音乐",

  search: async (keyword, page = 1, limit = 50): Promise<SearchResult> => {
    try {
      const data = {
        comm: {
          ct: "11",
          cv: "14090508",
          v: "14090508",
          tmeAppID: "qqmusic",
          phonetype: "EBG-AN10",
          deviceScore: "553.47",
          devicelevel: "50",
          newdevicelevel: "20",
          rom: "HuaWei/EMOTION/EmotionUI_14.2.0",
          os_ver: "12",
          OpenUDID: "0",
          OpenUDID2: "0",
          QIMEI36: "0",
          udid: "0",
          chid: "0",
          aid: "0",
          oaid: "0",
          taid: "0",
          tid: "0",
          wid: "0",
          uid: "0",
          sid: "0",
          modeSwitch: "6",
          teenMode: "0",
          ui_mode: "2",
          nettype: "1020",
          v4ip: "",
        },
        req: {
          module: "music.search.SearchCgiService",
          method: "DoSearchForQQMusicMobile",
          param: {
            search_type: 0,
            searchid: Math.random().toString().slice(2),
            query: keyword,
            page_num: page,
            num_per_page: limit,
            cat: 2,
            grp: 1,
            sin: 0,
          },
        },
      };

      const sign = await zzcSign(JSON.stringify(data));
      const resp = await fetch(
        `https://u.y.qq.com/cgi-bin/musics.fcg?sign=${sign}`,
        { method: "POST", body: JSON.stringify(data) },
      );
      const text = await resp.text();
      const body = JSON.parse(text);

      if (!body || !body.req || body.code !== 0 || body.req.code !== 0) {
        return { songs: [], total: 0 };
      }

      const songs = handleResult(body.req.data?.body?.item_song || []);
      const total = body.req.data?.meta?.sum || songs.length;
      return { songs, total };
    } catch {
      return { songs: [], total: 0 };
    }
  },

  getCoverUrl: async (id: string): Promise<string> => {
    const info = await getSongInfo(id);
    if (!info.albumMid) throw new Error("获取封面失败");
    return `https://y.gtimg.cn/music/photo_new/T002R500x500M000${info.albumMid}.jpg`;
  },

  getLyric: async (id: string): Promise<LyricInfo | null> => {
    const info = await getSongInfo(id);
    if (!info.songId) return null;

    const data = {
      comm: { ct: "19", cv: "1859", uin: "0" },
      req: {
        method: "GetPlayLyricInfo",
        module: "music.musichallSong.PlayLyricInfo",
        param: {
          format: "json",
          crypt: 1,
          ct: 19,
          cv: 1873,
          interval: 0,
          lrc_t: 0,
          qrc: 1,
          qrc_t: 0,
          roma: 1,
          roma_t: 0,
          songID: id,
          trans: 1,
          trans_t: 0,
          type: -1,
        },
      },
    };

    const sign = await zzcSign(JSON.stringify(data));
    const resp = await fetch(
      `https://u.y.qq.com/cgi-bin/musicu.fcg?sign=${sign}`,
      { method: "POST", body: JSON.stringify(data) },
    );
    const body = await resp.json();
    if (body.code !== 0 || body.req?.code !== 0) return null;

    const { lyric, trans, roma } = body.req.data;
    return parseTxLyric(lyric, trans, roma);
  },
};

function handleResult(rawList: any[]): OnlineSongInfo[] {
  if (!rawList || !Array.isArray(rawList)) return [];
  const list: OnlineSongInfo[] = [];
  for (const item of rawList) {
    if (!item.file?.media_mid) continue;
    list.push({
      id: item.mid || "",
      src: "tx",
      title: item.title || "",
      artist: formatSingerName(item.singer),
      album: item.album?.name || "",
      duration: item.interval || 0,
    });
  }
  return list;
}

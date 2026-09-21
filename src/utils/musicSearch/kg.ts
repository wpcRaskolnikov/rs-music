import type {
  MusicProvider,
  SearchResult,
  OnlineSongInfo,
  LyricInfo,
} from "./types";
import { fetch } from "@tauri-apps/plugin-http";
import { formatSingerName } from "../index";

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

function fail(): SearchResult {
  return { songs: [], total: 0 };
}

function searchLastPageSync(
  keyword: string,
  page: number,
  limit: number,
): Promise<SearchResult> {
  const first = doSearch(keyword, 1, 1);
  return first.then(({ total, errorCode }) => {
    if (errorCode !== null) return fail();
    const offset = (page - 1) * limit;
    const remaining = total - offset;
    if (remaining <= 0)
      return { songs: [], total };
    const newPage = Math.floor(offset / remaining) + 1;
    return doSearch(keyword, newPage, remaining).then(
      ({ lists, errorCode: err2 }) =>
        err2 !== null
          ? fail()
          : { songs: handleResult(lists), total },
    );
  });
}

function handleResult(rawData: any[]): OnlineSongInfo[] {
  const ids = new Set<string>();
  const list: OnlineSongInfo[] = [];
  for (const item of rawData) {
    const key = `${item.Audioid}${item.FileHash}`;
    if (ids.has(key)) continue;
    ids.add(key);
    list.push({
      id: item.FileHash || "",
      src: "kg",
      title: item.SongName || "",
      artist: formatSingerName(item.Singers),
      album: item.AlbumName || "",
      duration: item.Duration || 0,
    });
  }
  return list;
}

export const kgProvider: MusicProvider = {
  name: "酷狗",

  search: async (keyword, page = 1, limit = 50): Promise<SearchResult> => {
    const { lists, total, errorCode } = await doSearch(keyword, page, limit);
    if (errorCode !== null) {
      if (errorCode === 149 && page > 1)
        return searchLastPageSync(keyword, page, limit);
      return fail();
    }
    return { songs: handleResult(lists), total };
  },

  getCoverUrl: async (id: string): Promise<string> => {
    const resp = await fetch(
      "http://media.store.kugou.com/v1/get_res_privilege",
      {
        method: "POST",
        headers: {
          "KG-RC": "1",
          "KG-THash": "expand_search_manager.cpp:852736169:451",
          "User-Agent": "KuGou2012-9020-ExpandSearchManager",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appid: 1001,
          area_code: "1",
          behavior: "play",
          clientver: "9020",
          need_hash_offset: 1,
          relate: 1,
          resource: [
            {
              album_audio_id: id,
              album_id: 0,
              hash: id,
              id: 0,
              name: "",
              type: "audio",
            },
          ],
          token: "",
          userid: 2626431536,
          vip: 1,
        }),
      },
    );

    const body = await resp.json();
    if (body.error_code !== 0 || !body.data?.length) {
      throw new Error("获取封面失败");
    }
    const info = body.data[0].info;
    const img = info.imgsize
      ? info.image.replace("{size}", info.imgsize[0])
      : info.image;
    if (!img) throw new Error("获取封面失败");
    return img;
  },

  getLyric: async (id: string): Promise<LyricInfo | null> => {
    const searchUrl = `http://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=&hash=${id}&timelength=0&lrctxt=1`;
    const searchResp = await fetch(searchUrl, {
      headers: {
        "KG-RC": "1",
        "KG-THash": "expand_search_manager.cpp:852736169:451",
        "User-Agent": "KuGou2012-9020-ExpandSearchManager",
      },
    });

    if (!searchResp.ok) return null;
    const searchData = await searchResp.json();
    if (!searchData.candidates?.length) return null;

    const { id: lyricId, accesskey, fmt } = searchData.candidates[0];

    const downloadUrl = `http://lyrics.kugou.com/download?ver=1&client=pc&id=${lyricId}&accesskey=${accesskey}&fmt=${fmt}&charset=utf8`;
    const dlResp = await fetch(downloadUrl, {
      headers: {
        "KG-RC": "1",
        "KG-THash": "expand_search_manager.cpp:852736169:451",
        "User-Agent": "KuGou2012-9020-ExpandSearchManager",
      },
    });

    if (!dlResp.ok) return null;
    const dlData = await dlResp.json();

    if (fmt === "lrc" && dlData.content) {
      return {
        lyric: atob(dlData.content),
        tlyric: "",
        rlyric: "",
        lxlyric: "",
      };
    }

    return null;
  },
};

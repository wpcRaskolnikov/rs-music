import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { Source, SearchResult, LyricInfo, MusicProvider } from "./types";
import { kwProvider } from "./kw";
import { kgProvider } from "./kg";
import { txProvider } from "./tx";
import { wyProvider } from "./wy";
import { mgProvider } from "./mg";

export { providers };
export type { Source, SearchResult, LyricInfo, MusicProvider, OnlineSongInfo } from "./types";

const providers: Record<Source, MusicProvider> = {
  kw: kwProvider,
  kg: kgProvider,
  tx: txProvider,
  wy: wyProvider,
  mg: mgProvider,
};

function getProvider(source: Source): MusicProvider {
  return providers[source];
}

export const ONLINE_SEARCH_KEY = "onlineSearch";

interface UseOnlineSearchOptions {
  source: Source | null;
  keyword: string;
  page: number;
}

export function useOnlineSearch({
  source,
  keyword,
  page,
}: UseOnlineSearchOptions) {
  const cleanKeyword = keyword.trim();

  return useQuery<SearchResult>({
    queryKey: [ONLINE_SEARCH_KEY, source, cleanKeyword, page],
    queryFn: async () => {
      const res = await getProvider(source!).search(cleanKeyword, page);
      if (!res.songs.length) {
        throw new Error("搜索结果为空");
      }
      return res;
    },
    enabled: !!source && !!cleanKeyword,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export async function getCoverUrl(source: Source, id: string): Promise<string> {
  return getProvider(source).getCoverUrl(id);
}

export async function getLyric(
  source: Source,
  id: string,
): Promise<LyricInfo | null> {
  return getProvider(source).getLyric(id);
}

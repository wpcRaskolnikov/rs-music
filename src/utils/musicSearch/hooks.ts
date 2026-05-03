import { useQuery } from "@tanstack/react-query";
import type { Source, PlatformResult } from "./types";
import { search as searchKw } from "./kw";
import { search as searchKg } from "./kg";
import { search as searchQq } from "./qq";
import { search as searchWy } from "./wy";
import { search as searchMg } from "./mg";

const searchFnMap: Record<Source, typeof searchKw> = {
  kw: searchKw,
  kg: searchKg,
  qq: searchQq,
  wy: searchWy,
  mg: searchMg,
};

export const ONLINE_SEARCH_KEY = "onlineSearch";

interface UseOnlineSearchOptions {
  source: Source | null;
  keyword: string;
  page: number;
}

export function useOnlineSearch({ source, keyword, page }: UseOnlineSearchOptions) {
  return useQuery<PlatformResult>({
    queryKey: [ONLINE_SEARCH_KEY, source, keyword, page],
    queryFn: () => {
      return searchFnMap[source!](keyword.trim(), page).then((res) => {
        if (res.error && res.songs.length === 0) {
          throw new Error(res.error);
        }
        return res;
      });
    },
    enabled: !!source && !!keyword.trim(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

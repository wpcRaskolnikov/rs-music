import { atom } from "jotai";
import { currentTimeAtom } from "./playbackAtom";

export interface LrcLine {
  time: number;
  content: string;
  translation?: string;
}

export const lyricsAtom = atom<LrcLine[] | null>(null);

function findActiveIndex(lines: LrcLine[], currentTime: number): number {
  if (lines.length === 0) return -1;
  let lo = 0,
    hi = lines.length - 1,
    result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentTime) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

export const activeLyricIndexAtom = atom((get) => {
  const lyrics = get(lyricsAtom);
  const currentTime = get(currentTimeAtom);
  if (!lyrics) return -1;
  return findActiveIndex(lyrics, currentTime);
});

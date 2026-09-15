import { atom } from "jotai";

export interface MusicMetadata {
  src: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
}

export const searchQueryAtom = atom("");
export const selectedPlaylistIdAtom = atom("");

export const currentTrackInfoAtom = atom<MusicMetadata>((get) => {
  const index = get(currentTrackIndexAtom);
  const { songs } = get(currentPlaylistAtom);
  if (index < 0 || index >= songs.length) {
    return {
      src: "",
      title: "Unknown title",
      artist: "Unknown artist",
      album: "Unknown album",
      duration: 240,
    };
  }
  return songs[index];
});
export const currentTimeAtom = atom(0);
export const isPlayingAtom = atom(false);
export const currentTrackIndexAtom = atom(-1);
export const currentPlaylistAtom = atom<{
  playlistId: string;
  songs: MusicMetadata[];
}>({ playlistId: "", songs: [] });

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

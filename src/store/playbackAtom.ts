import { atom } from "jotai";

export interface MusicMetadata {
  src: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
}

export const selectedPlaylistIdAtom = atom("");

export const searchQueryAtom = atom("");
export const isPlayingAtom = atom(false);
export const currentTimeAtom = atom(0);
export const currentTrackIndexAtom = atom(-1);
export const currentPlaylistAtom = atom<{
  playlistId: string;
  songs: MusicMetadata[];
}>({ playlistId: "", songs: [] });

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

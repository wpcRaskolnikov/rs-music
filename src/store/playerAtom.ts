import { atom } from "jotai";

export interface MusicMetadata {
  src: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
}

export const playListAtom = atom<MusicMetadata[]>([]);

export const currentIndexAtom = atom(0);
export const triggerAtom = atom(false);

export const currentMusicAtom = atom((get) => {
  const playlist = get(playListAtom);
  const idx = get(currentIndexAtom);
  return playlist.length
    ? playlist[idx]
    : {
        src: "",
        title: "Unknown title",
        artist: "Unknown artist",
        album: "Unknown album",
        duration: 240,
      };
});

import { atom } from "jotai";

export interface MusicMetadata {
  src: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
}

export const isPlayingAtom = atom(false);
export const volumeAtom = atom(1);
export const isMutedAtom = atom(false);

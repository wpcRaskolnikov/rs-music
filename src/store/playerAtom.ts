import { atom } from "jotai";
import { load } from "@tauri-apps/plugin-store";

export const settingsStore = load("settings.json");

function atomWithSettings<T>(key: string, initialValue: T) {
  const base = atom(initialValue);
  return atom(
    (get) => get(base),
    (_get, set, newValue: T) => {
      set(base, newValue);
      settingsStore.then((store) => store.set(key, newValue));
    },
  );
}

export interface MusicMetadata {
  src: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
}

export const isPlayingAtom = atom(false);
export const volumeAtom = atomWithSettings("volume", 1);
export const isMutedAtom = atomWithSettings("isMuted", false);
export const playModeAtom = atomWithSettings("playMode", "listLoop");

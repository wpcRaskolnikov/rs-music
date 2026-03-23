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

export interface Shortcuts {
  playPause: string;
  mute: string;
  volumeUp: string;
  volumeDown: string;
  prevSong: string;
  nextSong: string;
}

export const defaultShortcuts: Shortcuts = {
  playPause: "Space",
  mute: "KeyM",
  volumeUp: "ArrowUp",
  volumeDown: "ArrowDown",
  prevSong: "ArrowLeft",
  nextSong: "ArrowRight",
};

export const volumeAtom = atomWithSettings("volume", 1);
export const isMutedAtom = atomWithSettings("isMuted", false);
export const playModeAtom = atomWithSettings("playMode", "listLoop");
export const shortcutsAtom = atomWithSettings<Shortcuts>(
  "shortcuts",
  defaultShortcuts,
);

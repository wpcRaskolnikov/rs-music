import { atom, getDefaultStore } from "jotai/vanilla";
import { load } from "@tauri-apps/plugin-store";
import { downloadDir } from "@tauri-apps/api/path";

export const settingsStore = await load("settings.json");

function atomWithSettings<T>(key: string, initialValue: T) {
  const base = atom(initialValue);

  (async () => {
    const stored = await settingsStore.get<T>(key);
    if (stored) {
      getDefaultStore().set(base, stored);
    }
  })();

  return atom(
    (get) => get(base),
    (get, set, update: T | ((prev: T) => T)) => {
      const prev = get(base);
      const next =
        typeof update === "function"
          ? (update as (prev: T) => T)(prev)
          : update;

      set(base, next);
      settingsStore.set(key, next);
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
export const shortcutsAtom = atomWithSettings<Shortcuts>(
  "shortcuts",
  defaultShortcuts,
);

export const volumeAtom = atomWithSettings("volume", 1);
export const isMutedAtom = atomWithSettings("isMuted", false);
export const playModeAtom = atomWithSettings("playMode", "listLoop");

export interface UserApiMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  scriptContent: string;
}
export const userApiListAtom = atomWithSettings<UserApiMeta[]>("userApis", []);
export const selectedApiIdAtom = atomWithSettings<string>("selectedApiId", "");

const defaultDir = await downloadDir();
export const downloadDirAtom = atomWithSettings<string>("downloadDir", defaultDir);



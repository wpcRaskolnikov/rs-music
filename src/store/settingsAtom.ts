import { atom, getDefaultStore } from "jotai/vanilla";
import { load } from "@tauri-apps/plugin-store";
import { downloadDir } from "@tauri-apps/api/path";

export const settingsStore = load("settings.json");

function atomWithSettings<T>(key: string, initialValue: T) {
  const base = atom(initialValue);

  settingsStore.then(async (store) => {
    const stored = await store.get<T>(key);
    if (stored) {
      getDefaultStore().set(base, stored);
    }
  });

  return atom(
    (get) => get(base),
    (get, set, update: T | ((prev: T) => T)) => {
      const prev = get(base);
      const next =
        typeof update === "function"
          ? (update as (prev: T) => T)(prev)
          : update;

      set(base, next);
      settingsStore.then((store) => store.set(key, next));
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
export const downloadDirAtom = atomWithSettings<string>("downloadDir", "");

export async function initSettings() {
  const store = await settingsStore;
  const savedDir = await store.get<string>("downloadDir");
  if (!savedDir) {
    const defaultDir = await downloadDir();
    await store.set("downloadDir", defaultDir);
  }
}

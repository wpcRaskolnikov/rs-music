export {
  selectedPlaylistIdAtom,
  searchQueryAtom,
  isPlayingAtom,
  currentTimeAtom,
  currentTrackIndexAtom,
  currentPlaylistAtom,
  currentTrackInfoAtom,
} from "./playbackAtom";

export type { MusicMetadata } from "./playbackAtom";

export {
  settingsStore,
  defaultShortcuts,
  volumeAtom,
  isMutedAtom,
  playModeAtom,
  shortcutsAtom,
  userApiListAtom,
  selectedApiIdAtom,
  downloadDirAtom,
} from "./settingsAtom";

export type { Shortcuts, UserApiMeta } from "./settingsAtom";

export { lyricsAtom, activeLyricIndexAtom } from "./lyricsAtom";

export type { LrcLine } from "./lyricsAtom";

export { getDb } from "./db";

export {
  selectedPlaylistIdAtom,
  searchQueryAtom,
  isPlayingAtom,
  currentTimeAtom,
  currentTrackIndexAtom,
  currentPlaylistAtom,
  currentTrackInfoAtom,
  lyricsAtom,
  activeLyricIndexAtom,
} from "./playbackAtom";

export type { MusicMetadata, LrcLine } from "./playbackAtom";

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

export { db } from "./db";

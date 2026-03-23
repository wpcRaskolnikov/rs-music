export {
  searchQueryAtom,
  isPlayingAtom,
  currentTimeAtom,
  currentTrackAtom,
  currentPlaylistAtom,
  currentTrackInfoAtom,
  playlistMenusAtom,
} from "./playbackAtom";

export type { MusicMetadata, PlaylistMenu } from "./playbackAtom";

export {
  settingsStore,
  defaultShortcuts,
  volumeAtom,
  isMutedAtom,
  playModeAtom,
  shortcutsAtom,
} from "./settingsAtom";

export type { Shortcuts } from "./settingsAtom";

export { lyricsAtom, activeLyricIndexAtom } from "./lyricsAtom";

export type { LrcLine } from "./lyricsAtom";

export { getDb } from "./db";

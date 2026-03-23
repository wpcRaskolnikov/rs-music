import { atom } from "jotai";

export interface MusicMetadata {
  src: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
}

export interface PlaylistMenu {
  label: string;
  playlistId: string;
}

export const playlistMenusAtom = atom<PlaylistMenu[]>([]);

export const searchQueryAtom = atom("");
export const isPlayingAtom = atom(false);
export const currentTimeAtom = atom(0);
export const currentTrackAtom = atom({ index: -1, playlistId: "" });
export const currentPlaylistAtom = atom<{ id: string; songs: MusicMetadata[] }>(
  { id: "", songs: [] },
);

export const currentTrackInfoAtom = atom<MusicMetadata>((get) => {
  const { index } = get(currentTrackAtom);
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

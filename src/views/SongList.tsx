import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { PlaylistPanel, SongTable } from "../components";
import { invoke } from "@tauri-apps/api/core";
import { arrayMove } from "@dnd-kit/helpers";
import { load } from "@tauri-apps/plugin-store";
import { useAtom, useSetAtom } from "jotai";
import {
  MusicMetadata,
  getDb,
  isPlayingAtom,
  currentTrackIndexAtom,
  currentPlaylistAtom,
  selectedPlaylistIdAtom,
} from "../store";

const SongList: React.FC = () => {
  const [currentPlaylist, setCurrentPlaylist] = useAtom(currentPlaylistAtom);
  const [selectedPlaylistId, setSelectedPlaylistId] = useAtom(
    selectedPlaylistIdAtom,
  );
  const [localSongList, setLocalSongList] = useState<MusicMetadata[]>([]);
  const setIsPlaying = useSetAtom(isPlayingAtom);
  const [currentTrackIndex, setCurrentTrackIndex] = useAtom(
    currentTrackIndexAtom,
  );

  const songList =
    selectedPlaylistId === currentPlaylist.playlistId
      ? currentPlaylist.songs
      : localSongList;

  const loadSongs = async (id: string, force = false) => {
    if (!id) return;
    if (id === currentPlaylist.playlistId && !force) return;
    const db = await getDb();
    const rows = await db.select<MusicMetadata[]>(
      "SELECT * FROM music WHERE playlist_id = ? ORDER BY sort_order",
      [id],
    );
    if (id === currentPlaylist.playlistId) {
      setCurrentPlaylist({ playlistId: id, songs: rows });
    } else {
      setLocalSongList(rows);
    }
  };

  const handleReorder = async (from: number, to: number) => {
    const newList = arrayMove(songList, from, to);
    if (selectedPlaylistId === currentPlaylist.playlistId) {
      setCurrentPlaylist({ playlistId: selectedPlaylistId, songs: newList });
    } else {
      setLocalSongList(newList);
    }
    if (
      selectedPlaylistId === currentPlaylist.playlistId &&
      currentTrackIndex >= 0
    ) {
      const playingSrc = songList[currentTrackIndex].src;
      const newCi = newList.findIndex((s) => s.src === playingSrc);
      if (newCi !== currentTrackIndex) {
        setCurrentTrackIndex(newCi);
        const store = await load("last_played.json");
        await store.set("index", newCi);
      }
    }
    await invoke("move_music", { playlistId: selectedPlaylistId, from, to });
  };

  const handlePlay = (index: number) => {
    if (selectedPlaylistId !== currentPlaylist.playlistId) {
      setCurrentPlaylist({ playlistId: selectedPlaylistId, songs: songList });
    }
    setIsPlaying(true);
    invoke("play_music", { playlistId: selectedPlaylistId, index });
  };

  const handleRemoveSong = async (index: number) => {
    const db = await getDb();
    await db.execute("DELETE FROM music WHERE playlist_id = ? AND src = ?", [
      selectedPlaylistId,
      songList[index].src,
    ]);
    const newList = songList.filter((_, i) => i !== index);
    if (selectedPlaylistId === currentPlaylist.playlistId) {
      setCurrentPlaylist({ playlistId: selectedPlaylistId, songs: newList });
      if (index < currentTrackIndex) {
        const newIndex = currentTrackIndex - 1;
        setCurrentTrackIndex(newIndex);
        const store = await load("last_played.json");
        await store.set("index", newIndex);
      }
    } else {
      setLocalSongList(newList);
    }
  };

  useEffect(() => {
    if (currentPlaylist.playlistId) {
      setSelectedPlaylistId(currentPlaylist.playlistId);
    }
  }, []);

  useEffect(() => {
    if (!selectedPlaylistId) return;
    loadSongs(selectedPlaylistId);
  }, [selectedPlaylistId]);

  return (
    <Box display="flex" height="100%">
      <PlaylistPanel />
      <SongTable
        list={songList}
        currentIndex={
          selectedPlaylistId === currentPlaylist.playlistId
            ? currentTrackIndex
            : -1
        }
        onPlay={handlePlay}
        onRemove={handleRemoveSong}
        onReorder={handleReorder}
        onRefresh={() => loadSongs(selectedPlaylistId, true)}
      />
    </Box>
  );
};

export default SongList;

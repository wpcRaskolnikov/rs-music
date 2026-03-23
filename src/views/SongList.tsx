import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { PlaylistPanel, SongTable } from "../components";
import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { useAtom, useSetAtom } from "jotai";
import {
  MusicMetadata,
  isPlayingAtom,
  currentTrackAtom,
  currentPlaylistAtom,
} from "../store";

const SongList: React.FC = () => {
  const [playlistId, setPlaylistId] = useState("");
  const [localSongList, setLocalSongList] = useState<MusicMetadata[]>([]);
  const setIsPlaying = useSetAtom(isPlayingAtom);
  const [currentTrack, setCurrentTrack] = useAtom(currentTrackAtom);
  const [currentPlaylist, setCurrentPlaylist] = useAtom(currentPlaylistAtom);
  const songList =
    playlistId === currentPlaylist.id ? currentPlaylist.songs : localSongList;

  const loadSongs = async (id: string) => {
    const db = await Database.load("sqlite:db.sqlite");
    const rows = await db.select<MusicMetadata[]>(
      "SELECT * FROM music WHERE playlist_id = ? ORDER BY sort_order",
      [id],
    );
    if (id === currentPlaylist.id) {
      setCurrentPlaylist({ id, songs: rows });
    } else {
      setLocalSongList(rows);
    }
  };

  const handleReorder = async (
    newList: MusicMetadata[],
    from: number,
    to: number,
  ) => {
    if (playlistId === currentPlaylist.id) {
      setCurrentPlaylist({ id: playlistId, songs: newList });
    } else {
      setLocalSongList(newList);
    }
    if (playlistId === currentTrack.playlistId && currentTrack.index >= 0) {
      const playingSrc = songList[currentTrack.index].src;
      const newCi = newList.findIndex((s) => s.src === playingSrc);
      if (newCi !== currentTrack.index) {
        setCurrentTrack({ ...currentTrack, index: newCi });
        const store = await load("last_played.json");
        await store.set("index", newCi);
      }
    }
    await invoke("move_music", { playlistId, from, to });
  };

  const handlePlay = (index: number) => {
    setIsPlaying(true);
    invoke("play_music", { playlistId, index });
  };

  const handleRemoveSong = async (src: string) => {
    const db = await Database.load("sqlite:db.sqlite");
    await db.execute("DELETE FROM music WHERE playlist_id = ? AND src = ?", [
      playlistId,
      src,
    ]);
    const newList = songList.filter((s) => s.src !== src);
    if (playlistId === currentPlaylist.id) {
      setCurrentPlaylist({ id: playlistId, songs: newList });
    } else {
      setLocalSongList(newList);
    }
  };

  useEffect(() => {
    if (!playlistId) return;
    loadSongs(playlistId);
  }, [playlistId]);

  return (
    <Box display="flex" height="100%">
      <PlaylistPanel
        onSelect={setPlaylistId}
        onImported={() => loadSongs(playlistId)}
      />
      <SongTable
        list={songList}
        currentIndex={
          playlistId === currentTrack.playlistId ? currentTrack.index : -1
        }
        onPlay={handlePlay}
        onRemove={handleRemoveSong}
        onReorder={handleReorder}
      />
    </Box>
  );
};

export default React.memo(SongList);

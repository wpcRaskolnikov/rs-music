import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { PlaylistPanel, SongTable } from "../components";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { useAtom, useSetAtom } from "jotai";
import {
  MusicMetadata,
  getDb,
  isPlayingAtom,
  currentTrackIndexAtom,
  currentPlaylistAtom,
} from "../store";

const SongList: React.FC = () => {
  const [currentPlaylist, setCurrentPlaylist] = useAtom(currentPlaylistAtom);
  const [playlistId, setPlaylistId] = useState(currentPlaylist.playlistId);
  const [localSongList, setLocalSongList] = useState<MusicMetadata[]>([]);
  const setIsPlaying = useSetAtom(isPlayingAtom);
  const [currentTrackIndex, setCurrentTrackIndex] = useAtom(
    currentTrackIndexAtom,
  );
  const songList =
    playlistId === currentPlaylist.playlistId
      ? currentPlaylist.songs
      : localSongList;

  const loadSongs = async (id: string) => {
    // 切换到当前播放歌单时无需读库，songList 直接从 currentPlaylist.songs 渲染
    if (id === currentPlaylist.playlistId) return;

    const db = await getDb();
    const rows = await db.select<MusicMetadata[]>(
      "SELECT * FROM music WHERE playlist_id = ? ORDER BY sort_order",
      [id],
    );
    setLocalSongList(rows);
  };

  const handleReorder = async (
    newList: MusicMetadata[],
    from: number,
    to: number,
  ) => {
    if (playlistId === currentPlaylist.playlistId) {
      setCurrentPlaylist({ playlistId, songs: newList });
    } else {
      setLocalSongList(newList);
    }
    if (playlistId === currentPlaylist.playlistId && currentTrackIndex >= 0) {
      const playingSrc = songList[currentTrackIndex].src;
      const newCi = newList.findIndex((s) => s.src === playingSrc);
      if (newCi !== currentTrackIndex) {
        setCurrentTrackIndex(newCi);
        const store = await load("last_played.json");
        await store.set("index", newCi);
      }
    }
    await invoke("move_music", { playlistId, from, to });
  };

  const handlePlay = (index: number) => {
    if (playlistId !== currentPlaylist.playlistId) {
      setCurrentPlaylist({ playlistId, songs: songList });
    }
    setIsPlaying(true);
    invoke("play_music", { playlistId, index });
  };

  const handleRemoveSong = async (src: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM music WHERE playlist_id = ? AND src = ?", [
      playlistId,
      src,
    ]);
    const newList = songList.filter((s) => s.src !== src);
    if (playlistId === currentPlaylist.playlistId) {
      setCurrentPlaylist({ playlistId, songs: newList });
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
        onSelectedImported={() => loadSongs(playlistId)}
      />
      <SongTable
        list={songList}
        currentIndex={
          playlistId === currentPlaylist.playlistId ? currentTrackIndex : -1
        }
        onPlay={handlePlay}
        onRemove={handleRemoveSong}
        onReorder={handleReorder}
      />
    </Box>
  );
};

export default SongList;

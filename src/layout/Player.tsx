import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import Database from "@tauri-apps/plugin-sql";
import React, { useState, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  isPlayingAtom,
  currentIndexAtom,
  currentPlaylistIdAtom,
  scrollToCurrentAtom,
  volumeAtom,
  isMutedAtom,
  playModeAtom,
  settingsStore,
} from "../store";
import { useLatest } from "../utils";
import { Box, IconButton, Tooltip } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";

import {
  AlbumCover,
  SongInfo,
  VolumeControl,
  PlayModeButton,
  PlayControls,
  ProgressBar,
} from "../components";
import { MusicMetadata } from "../store";

const Player: React.FC = () => {
  const [currentMusic, setCurrentMusic] = useState<MusicMetadata>({
    src: "",
    title: "Unknown title",
    artist: "Unknown artist",
    album: "Unknown album",
    duration: 240,
  });

  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
  const setCurrentIndex = useSetAtom(currentIndexAtom);
  const setCurrentPlaylistId = useSetAtom(currentPlaylistIdAtom);
  const setScrollToCurrent = useSetAtom(scrollToCurrentAtom);
  const [volume, setVolume] = useAtom(volumeAtom);
  const [isMuted, setIsMuted] = useAtom(isMutedAtom);
  const [, setPlayMode] = useAtom(playModeAtom);
  const isPlayingRef = useLatest(isPlaying);
  const volumeRef = useLatest(volume);
  const isMutedRef = useLatest(isMuted);

  // 按键绑定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          invoke(isPlayingRef.current ? "pause_music" : "resume_music");
          setIsPlaying((prev) => !prev);
          break;
        case "KeyM":
          if (isMutedRef.current) {
            invoke("set_volume", { value: volumeRef.current });
          } else {
            invoke("set_volume", { value: 0 });
          }
          setIsMuted(!isMutedRef.current);
          break;
        case "ArrowUp": {
          e.preventDefault();
          const newVolume = Math.min(1, volumeRef.current + 0.05);
          setVolume(newVolume);
          setIsMuted(false);
          invoke("set_volume", { value: newVolume });
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const newVolume = Math.max(0, volumeRef.current - 0.05);
          setVolume(newVolume);
          if (newVolume === 0) setIsMuted(true);
          invoke("set_volume", { value: newVolume });
          break;
        }
        case "ArrowLeft":
          e.preventDefault();
          invoke("play_prev");
          setIsPlaying(true);
          break;
        case "ArrowRight":
          e.preventDefault();
          invoke("play_next");
          setIsPlaying(true);
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 初始化播放设置
  useEffect(() => {
    (async () => {
      const store = await settingsStore;

      const volume = await store.get<number>("volume");
      if (volume) {
        setVolume(volume);
        invoke("set_volume", { value: volume });
      }

      const isMuted = await store.get<boolean>("isMuted");
      if (isMuted) {
        setIsMuted(isMuted);
        invoke("set_volume", { value: 0 });
      }

      const playMode = await store.get<string>("playMode");
      if (playMode) {
        setPlayMode(playMode);
        invoke("set_play_mode", { mode: playMode });
      }
    })();
  }, []);

  // 恢复上次播放
  useEffect(() => {
    (async () => {
      const store = await load("last_played.json");
      const playlistId = await store.get<string>("playlist_id");
      const index = await store.get<number>("index");
      if (playlistId != null && index != null) {
        const db = await Database.load("sqlite:db.sqlite");
        const rows = await db.select<MusicMetadata[]>(
          "SELECT src, title, artist, album, duration FROM music WHERE playlist_id = ? ORDER BY sort_order LIMIT 1 OFFSET ?",
          [playlistId, index],
        );
        if (rows.length > 0) {
          setCurrentMusic(rows[0]);
          setCurrentIndex(index);
          setCurrentPlaylistId(playlistId);
        }
      }
    })();
  }, []);

  // 切歌响应
  useEffect(() => {
    const unlisten = listen<
      MusicMetadata & { index: number; playlist_id: string }
    >("current-music-changed", (event) => {
      const { index, playlist_id, ...music } = event.payload;
      setCurrentMusic(music);
      setCurrentIndex(index);
      setCurrentPlaylistId(playlist_id);
      setIsPlaying(true);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <Box
      height="60px"
      display="flex"
      flexDirection="row"
      alignItems="center"
      paddingX={2}
      borderTop="1px solid #ddd"
      bgcolor="#f0f0f0"
    >
      {/* 唱片区域 */}
      <Box display="flex" alignItems="center" height="90%">
        <AlbumCover path={currentMusic.src} />
      </Box>
      <SongInfo title={currentMusic.title} artist={currentMusic.artist} />
      {currentMusic.src && (
        <Tooltip title="定位到当前歌曲">
          <IconButton
            size="small"
            onClick={() => setScrollToCurrent((n) => n + 1)}
          >
            <MyLocationIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {/* 进度条 */}
      <ProgressBar duration={currentMusic.duration} />
      {/* 音量控制 */}
      <VolumeControl />
      {/* 播放模式 */}
      <PlayModeButton />
      {/* 播放按钮 */}
      <PlayControls />
    </Box>
  );
};

export default Player;

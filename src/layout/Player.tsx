import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import Database from "@tauri-apps/plugin-sql";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAtom, useSetAtom } from "jotai";
import {
  isPlayingAtom,
  currentTrackAtom,
  scrollToCurrentAtom,
  volumeAtom,
  isMutedAtom,
  playModeAtom,
  shortcutsAtom,
  settingsStore,
} from "../store";
import type { Shortcuts } from "../store";
import { useLatest } from "../utils";
import { Box, IconButton, Tooltip } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import LyricsIcon from "@mui/icons-material/Lyrics";

import {
  AlbumCover,
  SongInfo,
  VolumeControl,
  PlayModeButton,
  PlayControls,
  ProgressBar,
} from "../components";
import LyricsPanel from "../components/player/LyricsPanel";
import { MusicMetadata } from "../store";

const Player: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentMusic, setCurrentMusic] = useState<MusicMetadata>({
    src: "",
    title: "Unknown title",
    artist: "Unknown artist",
    album: "Unknown album",
    duration: 240,
  });

  const [showLyrics, setShowLyrics] = useState(false);
  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
  const setCurrentTrack = useSetAtom(currentTrackAtom);
  const setScrollToCurrent = useSetAtom(scrollToCurrentAtom);
  const [volume, setVolume] = useAtom(volumeAtom);
  const [isMuted, setIsMuted] = useAtom(isMutedAtom);
  const [, setPlayMode] = useAtom(playModeAtom);
  const [shortcuts, setShortcuts] = useAtom(shortcutsAtom);
  const isPlayingRef = useLatest(isPlaying);
  const volumeRef = useLatest(volume);
  const isMutedRef = useLatest(isMuted);
  const shortcutsRef = useLatest(shortcuts);

  // 按键绑定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 防止与文本输入冲突
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const sc = shortcutsRef.current;
      const handlers: Record<string, () => void> = {
        [sc.playPause]: () => {
          invoke(isPlayingRef.current ? "pause_music" : "resume_music");
          setIsPlaying((prev) => !prev);
        },
        [sc.mute]: () => {
          invoke("set_volume", {
            value: isMutedRef.current ? volumeRef.current : 0,
          });
          setIsMuted(!isMutedRef.current);
        },
        [sc.volumeUp]: () => {
          const newVolume = Math.min(1, volumeRef.current + 0.05);
          setVolume(newVolume);
          setIsMuted(false);
          invoke("set_volume", { value: newVolume });
        },
        [sc.volumeDown]: () => {
          const newVolume = Math.max(0, volumeRef.current - 0.05);
          setVolume(newVolume);
          if (newVolume === 0) setIsMuted(true);
          invoke("set_volume", { value: newVolume });
        },
        [sc.prevSong]: () => {
          invoke("play_prev");
          setIsPlaying(true);
        },
        [sc.nextSong]: () => {
          invoke("play_next");
          setIsPlaying(true);
        },
      };

      const handler = handlers[e.code];
      if (handler) {
        e.preventDefault();
        handler();
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

      const shortcuts = await store.get<Shortcuts>("shortcuts");
      if (shortcuts) setShortcuts(shortcuts);
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
          setCurrentTrack({ index, playlistId });
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
      setCurrentTrack({ index, playlistId: playlist_id });
      setIsPlaying(true);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <>
      <LyricsPanel musicSrc={currentMusic.src} show={showLyrics} />
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
              onClick={() => {
                setScrollToCurrent((n) => n + 1);
                if (location.pathname !== "/songlist") {
                  navigate("/songlist", { state: { locate: true } });
                }
              }}
            >
              <MyLocationIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {currentMusic.src && (
          <Tooltip title={showLyrics ? "关闭歌词" : "显示歌词"}>
            <IconButton
              size="small"
              onClick={() => setShowLyrics((v) => !v)}
              sx={{ color: showLyrics ? "primary.main" : "inherit" }}
            >
              <LyricsIcon fontSize="small" />
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
    </>
  );
};

export default Player;

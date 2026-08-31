import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  currentTimeAtom,
  isPlayingAtom,
  currentTrackIndexAtom,
  currentPlaylistAtom,
  volumeAtom,
  isMutedAtom,
  shortcutsAtom,
  currentTrackInfoAtom,
  getDb,
} from "../store";
import type { MusicMetadata } from "../store";
import { useLatest } from "../utils";
import { Box, IconButton, Tooltip } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import LyricsIcon from "@mui/icons-material/Lyrics";

import {
  SongInfo,
  VolumeControl,
  PlayControls,
  ProgressBar,
  LyricsPanel,
} from "../components";

const Player: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showLyrics, setShowLyrics] = useState(false);
  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
  const setCurrentTrackIndex = useSetAtom(currentTrackIndexAtom);
  const setCurrentPlaylist = useSetAtom(currentPlaylistAtom);
  const [volume, setVolume] = useAtom(volumeAtom);
  const [isMuted, setIsMuted] = useAtom(isMutedAtom);
  const [shortcuts] = useAtom(shortcutsAtom);
  const setCurrentTime = useSetAtom(currentTimeAtom);
  const { src } = useAtomValue(currentTrackInfoAtom);

  // 按键绑定
  const isPlayingRef = useLatest(isPlaying);
  const volumeRef = useLatest(volume);
  const isMutedRef = useLatest(isMuted);
  const shortcutsRef = useLatest(shortcuts);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // 恢复上次播放
  useEffect(() => {
    (async () => {
      const store = await load("last_played.json");
      const playlistId = await store.get<string>("playlist_id");
      const index = await store.get<number>("index");
      if (playlistId != null && index != null) {
        const db = await getDb();
        const songs = await db.select<MusicMetadata[]>(
          "SELECT src, title, artist, album, duration FROM music WHERE playlist_id = ? ORDER BY sort_order",
          [playlistId],
        );
        if (songs.length > 0 && index < songs.length) {
          setCurrentPlaylist({ playlistId, songs });
          setCurrentTrackIndex(index);
        }
      }
    })();
  }, []);

  // 进度同步
  useEffect(() => {
    const unlisten = listen<number>("play-tick", (e) =>
      setCurrentTime(e.payload),
    );
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  // 切歌响应
  useEffect(() => {
    const unlisten = listen<
      MusicMetadata & { index: number; playlist_id: string }
    >("current-music-changed", (event) => {
      const { index } = event.payload;
      setCurrentTrackIndex(index);
      setCurrentTime(0);
      setIsPlaying(true);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <>
      {showLyrics && <LyricsPanel />}
      <Box
        height="60px"
        display="flex"
        flexDirection="row"
        alignItems="center"
        paddingX={2}
        borderTop="1px solid #ddd"
        bgcolor="#f0f0f0"
      >
        {/* 歌曲信息 */}
        <SongInfo />
        {src && (
          <>
            <Tooltip title="定位到当前歌曲">
              <IconButton
                size="small"
                onClick={() => {
                  if (location.pathname !== "/songlist") {
                    navigate("/songlist");
                  } else {
                    window.dispatchEvent(new CustomEvent("locate-playlist"));
                  }
                }}
              >
                <MyLocationIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={showLyrics ? "关闭歌词" : "显示歌词"}>
              <IconButton
                size="small"
                onClick={() => setShowLyrics((v) => !v)}
                sx={{ color: showLyrics ? "primary.main" : "inherit" }}
              >
                <LyricsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
        {/* 进度条 */}
        <ProgressBar />
        {/* 音量控制 */}
        <VolumeControl />
        {/* 播放控制 */}
        <PlayControls />
      </Box>
    </>
  );
};

export default Player;

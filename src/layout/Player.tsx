import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import Database from "@tauri-apps/plugin-sql";
import React, { useState, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { isPlayingAtom, volumeAtom, isMutedAtom } from "../store";
import { useLatest } from "../utils";
import { Box, Typography, Slider } from "@mui/material";
import {
  AlbumCover,
  SongInfo,
  VolumeControl,
  PlayModeButton,
  PlayControls,
} from "../components";
import { MusicMetadata } from "../store";
import { formatTime } from "../utils";

const Player: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(0);
  const [currentMusic, setCurrentMusic] = useState<MusicMetadata>({
    src: "",
    title: "Unknown title",
    artist: "Unknown artist",
    album: "Unknown album",
    duration: 240,
  });
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
  const [volume] = useAtom(volumeAtom);
  const [isMuted, setIsMuted] = useAtom(isMutedAtom);
  const isPlayingRef = useLatest(isPlaying);
  const volumeRef = useLatest(volume);
  const isMutedRef = useLatest(isMuted);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        if (isPlayingRef.current) {
          invoke("pause_music");
        } else {
          invoke("resume_music");
        }
        setIsPlaying((prev) => !prev);
      } else if (e.code === "KeyM") {
        if (isMutedRef.current) {
          invoke("set_volume", { value: volumeRef.current });
        } else {
          invoke("set_volume", { value: 0 });
        }
        setIsMuted((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    (async () => {
      const store = await load("last_played.json");
      const playlistId = await store.get<string>("playlist_id");
      const index = await store.get<number>("index");
      if (playlistId != null && index != null) {
        const db = await Database.load("sqlite:db.sqlite");
        const rows = await db.select<MusicMetadata[]>(
          "SELECT src, title, artist, album, duration FROM music WHERE playlist_id = ? LIMIT 1 OFFSET ?",
          [playlistId, index],
        );
        if (rows.length > 0) setCurrentMusic(rows[0]);
      }
    })();
  }, []);

  useEffect(() => {
    const unlisten = listen<number>("play-tick", (event) => {
      setCurrentTime(event.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<MusicMetadata>("current-music-changed", (event) => {
      setCurrentMusic(event.payload);
      setCurrentTime(0);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleSliderMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const percent = (event.clientX - rect.left) / rect.width;
      const time = Math.max(
        0,
        Math.min(currentMusic.duration, percent * currentMusic.duration),
      );
      setHoverTime(time);
    }
  };

  const handleSliderMouseLeave = () => {
    setHoverTime(null);
  };

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
      {/* 进度条 */}
      <Box flex={1} mx={2} display="flex" alignItems="center" gap={1}>
        <Typography variant="body2" minWidth={40} sx={{ fontSize: "0.75rem" }}>
          {formatTime(currentTime)}
        </Typography>
        <Box
          ref={sliderRef}
          flex={1}
          position="relative"
          onMouseMove={handleSliderMouseMove}
          onMouseLeave={handleSliderMouseLeave}
        >
          <Slider
            max={currentMusic.duration}
            value={currentTime}
            onChange={(_, value) => {
              invoke("seek_music", { value: value });
              setCurrentTime(value as number);
            }}
            aria-labelledby="progress-slider"
            sx={{
              width: "100%",
              color: "primary.main",
              height: 4,
              "& .MuiSlider-thumb": {
                width: 12,
                height: 12,
                transition: "all 0.2s ease",
                "&:hover": {
                  boxShadow: "0 0 0 8px rgba(25, 118, 210, 0.16)",
                },
              },
              "& .MuiSlider-track": {
                transition: "all 0.2s ease",
              },
              "& .MuiSlider-rail": {
                opacity: 0.3,
              },
              "&:hover": {
                "& .MuiSlider-track": {
                  height: 6,
                },
                "& .MuiSlider-rail": {
                  height: 6,
                },
                "& .MuiSlider-thumb": {
                  width: 14,
                  height: 14,
                },
              },
            }}
          />
          {hoverTime !== null && (
            <Box
              sx={{
                position: "absolute",
                bottom: 30,
                left: `${(hoverTime / currentMusic.duration) * 100}%`,
                transform: "translateX(-50%)",
                bgcolor: "rgba(0, 0, 0, 0.8)",
                color: "white",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: "0.7rem",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              {formatTime(hoverTime)}
            </Box>
          )}
        </Box>

        <Typography variant="body2" minWidth={40} sx={{ fontSize: "0.75rem" }}>
          -{formatTime(Math.max(0, currentMusic.duration - currentTime))}
        </Typography>
      </Box>
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

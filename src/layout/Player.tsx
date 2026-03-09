import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import React, { useState, useEffect, useRef } from "react";
import { Box, IconButton, Typography, Slider, Tooltip } from "@mui/material";
import {
  SkipPrevious as SkipPreIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  SkipNext as SkipNextIcon,
} from "@mui/icons-material";
import {
  AlbumCover,
  SongInfo,
  VolumeControl,
  PlayModeButton,
} from "../components";
import {
  currentMusicAtom,
  currentIndexAtom,
  playListAtom,
  triggerAtom,
} from "../store";
import { useAtomValue, useAtom, useSetAtom } from "jotai";
import { formatTime } from "../utils";

const Player: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const intervalRef = useRef<number>(0);
  const [trigger, setTrigger] = useAtom(triggerAtom);
  const currentMusic = useAtomValue(currentMusicAtom);
  const [playlist, setPlayList] = useAtom(playListAtom);
  const setCurrentIndex = useSetAtom(currentIndexAtom);
  const [playMode, setPlayMode] = useState("listLoop");
  const [loaded, setLoaded] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const store = await load("last_played.json");
      const val = await store.get<typeof currentMusic>("song");
      if (val) {
        setPlayList([val]);
        setCurrentIndex(0);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!loaded) {
        return;
      }
      invoke("play_music", { path: currentMusic.src });
      setIsPlaying(true);
      setCurrentTime(0);
      const store = await load("last_played.json");
      store.set("song", currentMusic);
    })();
  }, [loaded, trigger]);

  const playPreSong = () => {
    invoke("stop_music");
    switch (playMode) {
      case "listLoop": {
        setCurrentIndex((prev) => (prev - 1) % playlist.length);
        setTrigger((pre) => !pre);
        break;
      }
      case "random": {
        setCurrentIndex(() => Math.floor(Math.random() * playlist.length));
        setTrigger((pre) => !pre);
        break;
      }
      case "singleLoop": {
        setCurrentIndex((prev) => prev);
        setTrigger((pre) => !pre);
        break;
      }
    }
    setCurrentTime(0);
  };

  const playNextSong = () => {
    invoke("stop_music");
    switch (playMode) {
      case "listLoop": {
        setCurrentIndex((prev) => (prev + 1) % playlist.length);
        setTrigger((pre) => !pre);
        break;
      }
      case "random": {
        setCurrentIndex(() => Math.floor(Math.random() * playlist.length));
        setTrigger((pre) => !pre);
        break;
      }
      case "singleLoop": {
        setCurrentIndex((prev) => prev);
        setTrigger((pre) => !pre);
        break;
      }
    }
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (isPlaying) {
      invoke("pause_music");
    } else {
      invoke("resume_music");
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => prev + 0.5);
      }, 500);
    }
    return () => {
      clearInterval(intervalRef.current as any);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (currentTime >= currentMusic.duration) {
      playNextSong();
    }
  }, [currentTime]);

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
      <PlayModeButton onPlayModeChange={setPlayMode} />
      {/* 播放按钮 */}
      <Box display="flex" alignItems="center">
        <Tooltip title="上一首" arrow>
          <IconButton
            onClick={playPreSong}
            sx={{
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "scale(1.1)",
                bgcolor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <SkipPreIcon fontSize="large" />
          </IconButton>
        </Tooltip>
        <Tooltip title={isPlaying ? "暂停" : "播放"} arrow>
          <IconButton
            onClick={togglePlay}
            sx={{
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "scale(1.1)",
                bgcolor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            {isPlaying ? (
              <PauseIcon fontSize="large" />
            ) : (
              <PlayArrowIcon fontSize="large" />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title="下一首" arrow>
          <IconButton
            onClick={playNextSong}
            sx={{
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "scale(1.1)",
                bgcolor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <SkipNextIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Player;

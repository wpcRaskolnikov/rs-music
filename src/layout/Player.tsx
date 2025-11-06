import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import React, { useState, useEffect, useRef } from "react";
import { Box, IconButton, Typography, Slider } from "@mui/material";
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
        <Typography variant="body2" minWidth={40}>
          {formatTime(currentTime)}
        </Typography>
        <Slider
          max={currentMusic.duration}
          value={currentTime}
          onChange={(_, value) => {
            invoke("seek_music", { value: value });
            setCurrentTime(value);
          }}
          aria-labelledby="progress-slider"
          sx={{
            flex: 1,
            color: "primary.main",
            height: 4,
            "& .MuiSlider-thumb": {
              width: 12,
              height: 12,
            },
          }}
        />

        <Typography variant="body2" minWidth={40}>
          -{formatTime(Math.max(0, currentMusic.duration - currentTime))}
        </Typography>
      </Box>
      {/* 音量控制 */}
      <VolumeControl />
      {/* 播放模式 */}
      <PlayModeButton onPlayModeChange={setPlayMode} />
      {/* 播放按钮 */}
      <Box display="flex" alignItems="center">
        <IconButton onClick={playPreSong}>
          <SkipPreIcon fontSize="large" />
        </IconButton>
        <IconButton onClick={togglePlay}>
          {isPlaying ? (
            <PauseIcon fontSize="large" />
          ) : (
            <PlayArrowIcon fontSize="large" />
          )}
        </IconButton>
        <IconButton onClick={playNextSong}>
          <SkipNextIcon fontSize="large" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Player;

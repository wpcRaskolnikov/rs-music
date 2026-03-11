import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import React, { useEffect } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import {
  SkipPrevious as SkipPreIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  SkipNext as SkipNextIcon,
} from "@mui/icons-material";
import { isPlayingAtom } from "../../store";
import { useAtom } from "jotai";

const btnSx = {
  transition: "all 0.2s ease",
  "&:hover": {
    transform: "scale(1.1)",
    bgcolor: "rgba(0, 0, 0, 0.04)",
  },
};

const PlayControls: React.FC = () => {
  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);

  useEffect(() => {
    const unlisten = listen("current-music-changed", () => {
      setIsPlaying(true);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const playPrev = () => {
    invoke("play_prev");
    setIsPlaying(true);
  };

  const playNext = () => {
    invoke("play_next");
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (isPlaying) {
      invoke("pause_music");
    } else {
      invoke("resume_music");
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <Box display="flex" alignItems="center">
      <Tooltip title="上一首" arrow>
        <IconButton onClick={playPrev} sx={btnSx}>
          <SkipPreIcon fontSize="large" />
        </IconButton>
      </Tooltip>
      <Tooltip title={isPlaying ? "暂停" : "播放"} arrow>
        <IconButton onClick={togglePlay} sx={btnSx}>
          {isPlaying ? (
            <PauseIcon fontSize="large" />
          ) : (
            <PlayArrowIcon fontSize="large" />
          )}
        </IconButton>
      </Tooltip>
      <Tooltip title="下一首" arrow>
        <IconButton onClick={playNext} sx={btnSx}>
          <SkipNextIcon fontSize="large" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default PlayControls;

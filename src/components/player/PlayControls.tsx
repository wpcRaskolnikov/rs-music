import { invoke } from "@tauri-apps/api/core";
import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import {
  SkipPrevious as SkipPreIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  SkipNext as SkipNextIcon,
  Shuffle as ShuffleIcon,
  Repeat as RepeatIcon,
  RepeatOne as RepeatOneIcon,
} from "@mui/icons-material";
import { isPlayingAtom, playModeAtom } from "../../store";
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
  const [playMode, setPlayMode] = useAtom(playModeAtom);

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

  const togglePlayMode = () => {
    let nextMode = "listLoop";
    switch (playMode) {
      case "listLoop":
        nextMode = "random";
        break;
      case "random":
        nextMode = "singleLoop";
        break;
      case "singleLoop":
        nextMode = "listLoop";
        break;
    }
    setPlayMode(nextMode);
    invoke("set_play_mode", { mode: nextMode });
  };

  const playModeIcon = () => {
    switch (playMode) {
      case "listLoop":
        return <RepeatIcon />;
      case "random":
        return <ShuffleIcon />;
      case "singleLoop":
        return <RepeatOneIcon />;
    }
  };

  const playModeLabel = () => {
    switch (playMode) {
      case "listLoop":
        return "列表循环";
      case "random":
        return "随机播放";
      case "singleLoop":
        return "单曲循环";
      default:
        return "";
    }
  };

  return (
    <Box display="flex" alignItems="center">
      <Tooltip title={playModeLabel()} arrow>
        <IconButton onClick={togglePlayMode} sx={btnSx}>
          {playModeIcon()}
        </IconButton>
      </Tooltip>
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

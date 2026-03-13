import { invoke } from "@tauri-apps/api/core";
import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import {
  Shuffle as ShuffleIcon,
  Repeat as RepeatIcon,
  RepeatOne as RepeatOneIcon,
} from "@mui/icons-material";
import { useAtom } from "jotai";
import { playModeAtom } from "../../store";

const PlayModeButton: React.FC = () => {
  const [playMode, setPlayMode] = useAtom(playModeAtom);

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

  const renderIcon = () => {
    switch (playMode) {
      case "listLoop":
        return <RepeatIcon />;
      case "random":
        return <ShuffleIcon />;
      case "singleLoop":
        return <RepeatOneIcon />;
    }
  };

  const getPlayModeLabel = () => {
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
    <Tooltip title={getPlayModeLabel()} arrow>
      <IconButton
        onClick={togglePlayMode}
        sx={{
          transition: "all 0.2s ease",
          "&:hover": {
            transform: "scale(1.1)",
            bgcolor: "rgba(0, 0, 0, 0.04)",
          },
        }}
      >
        {renderIcon()}
      </IconButton>
    </Tooltip>
  );
};
export default PlayModeButton;

import { load } from "@tauri-apps/plugin-store";
import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import {
  Shuffle as ShuffleIcon,
  Repeat as RepeatIcon,
  RepeatOne as RepeatOneIcon,
} from "@mui/icons-material";
import { useState, useEffect } from "react";

const PlayModeButton: React.FC<{
  onPlayModeChange: (mode: string) => void;
}> = ({ onPlayModeChange }) => {
  const [playMode, setPlayMode] = useState("listLoop");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const store = await load("settings.json");
      const val = await store.get<string>("playMode");
      if (val) {
        setPlayMode(val);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!loaded) {
        return;
      }
      onPlayModeChange(playMode);
      const store = await load("settings.json");
      store.set("playMode", playMode);
    })();
  }, [loaded, playMode]);

  const togglePlayMode = () => {
    setPlayMode((prev) => {
      let nextMode = "listLoop";
      switch (prev) {
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
      return nextMode;
    });
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

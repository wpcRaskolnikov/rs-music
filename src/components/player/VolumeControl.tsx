import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import React from "react";
import { Box, IconButton, Slider, Typography, Paper } from "@mui/material";
import {
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  VolumeDown as VolumeDownIcon,
} from "@mui/icons-material";
import { useState, useEffect, useRef } from "react";

const VolumeControl: React.FC = () => {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const store = await load("settings.json");
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
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!loaded) {
        return;
      }
      const store = await load("settings.json");
      store.set("volume", volume);
      store.set("isMuted", isMuted);
    })();
  }, [volume, isMuted]);

  const updateVolume = (value: number) => {
    setVolume(value);
    invoke("set_volume", { value });
  };

  const toggleMute = () => {
    if (isMuted) {
      invoke("set_volume", { value: volume });
    } else {
      invoke("set_volume", { value: 0 });
    }
    setIsMuted(!isMuted);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowVolumeSlider(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 200);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeOffIcon />;
    } else if (volume < 0.5) {
      return <VolumeDownIcon />;
    }
    return <VolumeUpIcon />;
  };

  return (
    <Box
      position="relative"
      display="flex"
      alignItems="center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <IconButton onClick={toggleMute} size="small">
        {getVolumeIcon()}
      </IconButton>

      {showVolumeSlider && (
        <Paper
          elevation={3}
          sx={{
            position: "absolute",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            px: 0.5,
            pt: 0.5,
            pb: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            height: 130,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              mb: 0.5,
              fontWeight: 500,
              color: "primary.main",
              fontSize: "0.75rem",
            }}
          >
            {Math.round(volume * 100)}%
          </Typography>
          <Slider
            orientation="vertical"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(_, val) => {
              updateVolume(val as number);
              if (val === 0) {
                setIsMuted(true);
              } else {
                setIsMuted(false);
              }
            }}
            sx={{
              flex: 1,
              color: "primary.main",
              "& .MuiSlider-thumb": {
                width: 14,
                height: 14,
              },
              "& .MuiSlider-track": {
                width: 4,
              },
              "& .MuiSlider-rail": {
                width: 4,
                opacity: 0.3,
              },
            }}
          />
        </Paper>
      )}
    </Box>
  );
};
export default VolumeControl;

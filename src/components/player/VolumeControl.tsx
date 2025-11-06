import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import React from "react";
import { Box, IconButton, Slider } from "@mui/material";
import {
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
} from "@mui/icons-material";
import { useState, useEffect } from "react";

const VolumeControl: React.FC = () => {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [loaded, setLoaded] = useState(false);

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

  return (
    <Box
      position="relative"
      onMouseEnter={() => setShowVolumeSlider(true)}
      onMouseLeave={() => setShowVolumeSlider(false)}
      display="flex"
      alignItems="center"
    >
      <IconButton onClick={toggleMute} size="small">
        {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
      </IconButton>

      {showVolumeSlider && (
        <Box
          sx={{
            position: "absolute",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            p: 1,
            display: "flex",
            alignItems: "center",
            height: 100,
          }}
        >
          <Slider
            orientation="vertical"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(_, val) => {
              updateVolume(val);
              if (val === 0) {
                setIsMuted(true);
              } else {
                setIsMuted(false);
              }
            }}
          />
        </Box>
      )}
    </Box>
  );
};
export default VolumeControl;

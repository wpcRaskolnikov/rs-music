import { invoke } from "@tauri-apps/api/core";
import React, { useState, useRef } from "react";
import {
  Box,
  Fade,
  IconButton,
  Paper,
  Popper,
  Slider,
  Typography,
} from "@mui/material";
import {
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  VolumeDown as VolumeDownIcon,
} from "@mui/icons-material";
import { useAtom } from "jotai";
import { volumeAtom, isMutedAtom } from "../../store";

const VolumeControl: React.FC = () => {
  const [volume, setVolume] = useAtom(volumeAtom);
  const [isMuted, setIsMuted] = useAtom(isMutedAtom);
  const [isHovered, setIsHovered] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const updateVolume = (value: number) => {
    const newMuted = value === 0;
    setVolume(value);
    setIsMuted(newMuted);
    invoke("set_volume", { value });
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    invoke("set_volume", { value: newMuted ? 0 : volume });
    setIsMuted(newMuted);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeOffIcon />;
    if (volume < 0.5) return <VolumeDownIcon />;
    return <VolumeUpIcon />;
  };

  return (
    <Box
      display="inline-flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <IconButton ref={anchorRef} onClick={toggleMute} size="small">
        {getVolumeIcon()}
      </IconButton>

      <Popper
        open={isHovered}
        anchorEl={anchorRef.current}
        placement="top"
        transition
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <Paper
              elevation={3}
              sx={{
                px: 0.5,
                pt: 0.5,
                pb: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: 130,
                borderRadius: 2,
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
                onChange={(_, val) => updateVolume(val as number)}
                sx={{
                  flex: 1,
                  color: "primary.main",
                  "& .MuiSlider-thumb": { width: 14, height: 14 },
                  "& .MuiSlider-track": { width: 4 },
                  "& .MuiSlider-rail": { width: 4, opacity: 0.3 },
                }}
              />
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
};

export default VolumeControl;

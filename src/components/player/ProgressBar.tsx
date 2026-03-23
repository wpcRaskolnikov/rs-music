import { invoke } from "@tauri-apps/api/core";
import React, { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Box, Slider, Tooltip, Typography } from "@mui/material";
import { formatTime } from "../../utils";
import { currentTimeAtom, currentTrackInfoAtom } from "../../store";

const ProgressBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useAtom(currentTimeAtom);
  const { duration } = useAtomValue(currentTrackInfoAtom);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const handleMouseMove = (event: React.MouseEvent<HTMLSpanElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    setHoverTime(Math.max(0, Math.min(duration, percent * duration)));
  };

  return (
    <Box flex={1} mx={2} display="flex" alignItems="center" gap={1}>
      <Typography variant="body2" minWidth={40} sx={{ fontSize: "0.75rem" }}>
        {formatTime(currentTime)}
      </Typography>
      <Tooltip
        title={hoverTime !== null ? formatTime(hoverTime) : ""}
        followCursor
        placement="top"
      >
        <Slider
          max={duration}
          value={currentTime}
          onChange={(_, value) => {
            setCurrentTime(value as number);
            invoke("seek_music", { value });
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          sx={{
            flex: 1,
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
              "& .MuiSlider-track": { height: 6 },
              "& .MuiSlider-rail": { height: 6 },
              "& .MuiSlider-thumb": { width: 14, height: 14 },
            },
          }}
        />
      </Tooltip>
      <Typography variant="body2" minWidth={40} sx={{ fontSize: "0.75rem" }}>
        -{formatTime(Math.max(0, duration - currentTime))}
      </Typography>
    </Box>
  );
};

export default ProgressBar;

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import React, { useState, useEffect, useRef } from "react";
import { Box, Slider, Typography } from "@mui/material";
import { formatTime } from "../../utils";

interface Props {
  duration: number;
}

const ProgressBar: React.FC<Props> = ({ duration }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // 进度同步
  useEffect(() => {
    const unlisten = listen<number>("play-tick", (event) => {
      setCurrentTime(event.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  // 切歌重置进度
  useEffect(() => {
    const unlisten = listen("current-music-changed", () => {
      setCurrentTime(0);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const percent = (event.clientX - rect.left) / rect.width;
      setHoverTime(Math.max(0, Math.min(duration, percent * duration)));
    }
  };

  return (
    <Box flex={1} mx={2} display="flex" alignItems="center" gap={1}>
      <Typography variant="body2" minWidth={40} sx={{ fontSize: "0.75rem" }}>
        {formatTime(currentTime)}
      </Typography>
      <Box
        ref={sliderRef}
        flex={1}
        position="relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverTime(null)}
      >
        <Slider
          max={duration}
          value={currentTime}
          onChange={(_, value) => {
            invoke("seek_music", { value });
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
              "& .MuiSlider-track": { height: 6 },
              "& .MuiSlider-rail": { height: 6 },
              "& .MuiSlider-thumb": { width: 14, height: 14 },
            },
          }}
        />
        {hoverTime !== null && (
          <Box
            sx={{
              position: "absolute",
              bottom: 30,
              left: `${(hoverTime / duration) * 100}%`,
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
        -{formatTime(Math.max(0, duration - currentTime))}
      </Typography>
    </Box>
  );
};

export default ProgressBar;

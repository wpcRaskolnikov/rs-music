import { invoke } from "@tauri-apps/api/core";
import React, { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Box, List, ListItem, ListItemText, Typography } from "@mui/material";
import {
  currentTrackInfoAtom,
  lyricsAtom,
  activeLyricIndexAtom,
} from "../../store";
import type { LrcLine } from "../../store";

const LyricsPanel: React.FC = () => {
  const { src } = useAtomValue(currentTrackInfoAtom);
  const [lyrics, setLyrics] = useAtom(lyricsAtom);
  const activeIndex = useAtomValue(activeLyricIndexAtom);
  const activeLineRef = useRef<HTMLLIElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [displayKey, setDisplayKey] = useState(src);

  const lines = lyrics ?? [];

  useEffect(() => {
    if (!src) {
      setLyrics(null);
      setDisplayKey(src);
      return;
    }
    invoke<LrcLine[] | null>("get_lyrics", { path: src }).then((result) => {
      setLyrics(result);
      setDisplayKey(src);
    });
  }, [src]);

  const fadeInSx = {
    animation: "lyricsIn 0.4s ease",
    "@keyframes lyricsIn": { from: { opacity: 0 }, to: { opacity: 1 } },
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (scrollResumeTimer.current) clearTimeout(scrollResumeTimer.current);
    };
  }, []);

  const handleUserInteraction = () => {
    setIsUserScrolling(true);
    if (scrollResumeTimer.current) clearTimeout(scrollResumeTimer.current);
    scrollResumeTimer.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 3000);
  };

  // 自动滚动到当前行（用户手动浏览时跳过；恢复时立即回到当前行）
  useEffect(() => {
    if (!isUserScrolling) {
      activeLineRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, isUserScrolling]);

  return (
    <Box
      onWheel={handleUserInteraction}
      onTouchMove={handleUserInteraction}
      sx={{
        position: "fixed",
        left: "60px",
        top: "50px",
        right: 0,
        bottom: "60px",
        bgcolor: "rgba(10, 10, 10, 0.92)",
        zIndex: 200,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 4,
        px: 2,
      }}
    >
      {!lyrics ? (
        <Typography
          key={displayKey}
          sx={{ color: "rgba(255,255,255,0.4)", mt: "30vh", ...fadeInSx }}
        >
          暂无歌词
        </Typography>
      ) : (
        <List
          key={displayKey}
          disablePadding
          sx={{ width: "100%", maxWidth: 600, ...fadeInSx }}
        >
          <Box sx={{ height: "30vh" }} />
          {lines.map((line, i) => (
            <ListItem
              key={i}
              ref={i === activeIndex ? activeLineRef : undefined}
              disableGutters
              sx={{ justifyContent: "center", py: 0.8 }}
            >
              <ListItemText
                primary={line.content}
                secondary={line.translation ?? undefined}
                sx={{ textAlign: "center", m: 0 }}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: i === activeIndex ? "1.15rem" : "0.95rem",
                      fontWeight: i === activeIndex ? 700 : 400,
                      color:
                        i === activeIndex
                          ? "#ffffff"
                          : i < activeIndex
                            ? "rgba(255,255,255,0.35)"
                            : "rgba(255,255,255,0.55)",
                      transition: "all 0.3s ease",
                      lineHeight: 1.6,
                    },
                  },
                  secondary: {
                    sx: {
                      fontSize: i === activeIndex ? "0.85rem" : "0.72rem",
                      color:
                        i === activeIndex
                          ? "rgba(255,255,255,0.7)"
                          : i < activeIndex
                            ? "rgba(255,255,255,0.22)"
                            : "rgba(255,255,255,0.38)",
                      transition: "all 0.3s ease",
                      lineHeight: 1.5,
                      mt: 0.3,
                    },
                  },
                }}
              />
            </ListItem>
          ))}
          <Box sx={{ height: "30vh" }} />
        </List>
      )}
    </Box>
  );
};

export default LyricsPanel;

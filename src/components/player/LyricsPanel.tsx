import { invoke } from "@tauri-apps/api/core";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Box, List, ListItem, ListItemText, Typography } from "@mui/material";
import { motion, useSpring, AnimatePresence, animate } from "motion/react";
import {
  currentTrackInfoAtom,
  lyricsAtom,
  activeLyricIndexAtom,
} from "../../store";
import type { LrcLine } from "../../store";

function getLineStyle(i: number, activeIndex: number) {
  if (activeIndex < 0) return { opacity: 0.55 };

  const isActive = i === activeIndex;
  const isPast = i < activeIndex;
  const dist = Math.abs(i - activeIndex);

  const opacity = isActive
    ? 1
    : isPast
      ? 0.35
      : Math.max(0.25, 0.55 - dist * 0.04);

  return { opacity };
}

const springConfig = { stiffness: 18, damping: 12, mass: 1.2 };

// 单行歌词：只有 isActive 变化时才重渲染，opacity 由父组件命令式驱动
interface LyricLineProps {
  line: LrcLine;
  isActive: boolean;
  elRef: (el: HTMLDivElement | null) => void;
}

const LyricLine = React.memo(({ line, isActive, elRef }: LyricLineProps) => (
  <div ref={elRef}>
    <ListItem disableGutters sx={{ justifyContent: "center", py: 0.8 }}>
      <ListItemText
        primary={line.content}
        secondary={line.translation ?? undefined}
        sx={{ textAlign: "center", m: 0 }}
        slotProps={{
          primary: {
            sx: {
              fontSize: isActive ? "1.15rem" : "0.95rem",
              fontWeight: isActive ? 700 : 400,
              color: "#ffffff",
              lineHeight: 1.6,
            },
          },
          secondary: {
            sx: {
              fontSize: isActive ? "0.85rem" : "0.72rem",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.5,
              mt: 0.3,
            },
          },
        }}
      />
    </ListItem>
  </div>
));

const LyricsPanel: React.FC = () => {
  const { src } = useAtomValue(currentTrackInfoAtom);
  const [lyrics, setLyrics] = useAtom(lyricsAtom);
  const activeIndex = useAtomValue(activeLyricIndexAtom);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // 改为指向外层 div，同时用于滚动计算和命令式 opacity 动画
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const elRefCallbacks = useRef<((el: HTMLDivElement | null) => void)[]>([]);
  const getElRef = useCallback((i: number) => {
    if (!elRefCallbacks.current[i]) {
      elRefCallbacks.current[i] = (el: HTMLDivElement | null) => {
        lineRefs.current[i] = el;
      };
    }
    return elRefCallbacks.current[i];
  }, []);

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [displayKey, setDisplayKey] = useState(src);
  const [containerH, setContainerH] = useState(0);

  const lines = lyrics ?? [];

  // ---------- 数据加载 ----------
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

  // ---------- 容器高度 ----------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setContainerH(entry.contentRect.height),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---------- 命令式 opacity 动画 ----------
  // 切歌时立即设置，无动画
  useEffect(() => {
    lineRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.opacity = String(getLineStyle(i, activeIndex).opacity);
    });
  }, [lines.length]);

  // activeIndex 变化时动画过渡
  useEffect(() => {
    if (lines.length === 0) return;
    lineRefs.current.forEach((el, i) => {
      if (!el) return;
      const { opacity } = getLineStyle(i, activeIndex);
      animate(el, { opacity }, { duration: 0.4, ease: "easeOut" });
    });
  }, [activeIndex]);

  // ---------- spring 滚动偏移 ----------
  const targetY = useRef(0);
  const springY = useSpring(0, springConfig);

  const clampY = useCallback(
    (y: number) => {
      if (!listRef.current || containerH === 0) return y;
      const listHeight = listRef.current.scrollHeight;
      return Math.max(-(listHeight - containerH), Math.min(0, y));
    },
    [containerH],
  );

  const computeTargetY = useCallback(() => {
    if (
      activeIndex < 0 ||
      !lineRefs.current[activeIndex] ||
      !containerRef.current
    )
      return;
    const lineEl = lineRefs.current[activeIndex];
    if (!lineEl) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const lineRect = lineEl.getBoundingClientRect();
    const offset =
      lineRect.top + lineRect.height / 2 - (containerRect.top + containerH / 2);
    targetY.current = clampY(springY.get() - offset);
  }, [activeIndex, containerH, springY, clampY]);

  useEffect(() => {
    if (lines.length === 0 || containerH === 0) return;
    computeTargetY();
    if (!isUserScrolling) {
      springY.set(targetY.current);
    }
  }, [activeIndex, containerH, lines.length, isUserScrolling]);

  useEffect(() => {
    computeTargetY();
    springY.jump(targetY.current);
  }, [displayKey]);

  // ---------- 用户手动滚动 ----------
  useEffect(() => {
    return () => {
      if (scrollResumeTimer.current) clearTimeout(scrollResumeTimer.current);
    };
  }, []);

  const userScrollDelta = useRef(0);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      setIsUserScrolling(true);
      userScrollDelta.current -= e.deltaY;
      const clamped = clampY(targetY.current + userScrollDelta.current);
      userScrollDelta.current = clamped - targetY.current;
      springY.jump(clamped);

      if (scrollResumeTimer.current) clearTimeout(scrollResumeTimer.current);
      scrollResumeTimer.current = setTimeout(() => {
        setIsUserScrolling(false);
        userScrollDelta.current = 0;
        springY.set(targetY.current);
      }, 3000);
    },
    [springY, clampY],
  );

  const handleTouchMove = useCallback(() => {
    setIsUserScrolling(true);
    if (scrollResumeTimer.current) clearTimeout(scrollResumeTimer.current);
    scrollResumeTimer.current = setTimeout(() => {
      setIsUserScrolling(false);
      userScrollDelta.current = 0;
      springY.set(targetY.current);
    }, 3000);
  }, [springY]);

  return (
    <Box
      ref={containerRef}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      sx={{
        position: "fixed",
        left: "60px",
        top: "50px",
        right: 0,
        bottom: "60px",
        bgcolor: "rgba(10, 10, 10, 0.92)",
        zIndex: 200,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <AnimatePresence mode="wait">
        {!lyrics ? (
          <motion.div
            key={`empty-${displayKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ marginTop: "30vh" }}
          >
            <Typography sx={{ color: "rgba(255,255,255,0.4)" }}>
              暂无歌词
            </Typography>
          </motion.div>
        ) : (
          <motion.div
            key={`lyrics-${displayKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            <motion.div style={{ y: springY, width: "100%", maxWidth: 600 }}>
              <List ref={listRef} disablePadding>
                <Box sx={{ height: "50vh" }} />
                {lines.map((line, i) => (
                  <LyricLine
                    key={i}
                    line={line}
                    isActive={i === activeIndex}
                    elRef={getElRef(i)}
                  />
                ))}
                <Box sx={{ height: "50vh" }} />
              </List>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default LyricsPanel;

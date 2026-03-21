import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Box, Typography } from "@mui/material";

interface LyricLine {
  time: number;
  text: string;
}

function parseLrc(content: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const metaRegex = /^\[(?:ti|ar|al|by|offset|length|re|ve|#):/i;
  const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{1,3})\]/g;

  for (const rawLine of content.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed || metaRegex.test(trimmed)) continue;

    const times: number[] = [];
    let textStart = 0;

    timeRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = timeRegex.exec(trimmed)) !== null) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, "0"));
      times.push(min * 60 + sec + ms / 1000);
      textStart = timeRegex.lastIndex;
    }

    if (times.length === 0) continue;
    const text = trimmed.slice(textStart).trim();
    if (!text) continue;

    for (const time of times) {
      lines.push({ time, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

interface Props {
  musicSrc: string;
  show: boolean;
}

const LyricsPanel: React.FC<Props> = ({ musicSrc, show }) => {
  const [lyricsContent, setLyricsContent] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => parseLrc(lyricsContent), [lyricsContent]);
  const isPlainText = lyricsContent.length > 0 && lines.length === 0;

  // Binary search for active lyric line
  const activeIndex = useMemo(() => {
    if (lines.length === 0) return -1;
    let lo = 0,
      hi = lines.length - 1,
      result = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lines[mid].time <= currentTime) {
        result = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return result;
  }, [lines, currentTime]);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (!musicSrc) {
      setLyricsContent("");
      return;
    }
    invoke<string>("get_lyrics", { path: musicSrc }).then(setLyricsContent);
  }, [musicSrc]);

  // Listen to play-tick for current time
  useEffect(() => {
    const unlisten = listen<number>("play-tick", (e) =>
      setCurrentTime(e.payload),
    );
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  // Reset time on song change
  useEffect(() => {
    const unlisten = listen("current-music-changed", () => setCurrentTime(0));
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  // Auto-scroll active line into view
  useEffect(() => {
    if (show && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, show]);

  if (!show) return null;

  return (
    <Box
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
      {!lyricsContent ? (
        <Typography sx={{ color: "rgba(255,255,255,0.4)", mt: "30vh" }}>
          暂无歌词
        </Typography>
      ) : isPlainText ? (
        <Typography
          sx={{
            color: "rgba(255,255,255,0.85)",
            whiteSpace: "pre-wrap",
            maxWidth: 600,
            lineHeight: 2,
            mt: 4,
          }}
        >
          {lyricsContent}
        </Typography>
      ) : (
        <Box sx={{ width: "100%", maxWidth: 600 }}>
          <Box sx={{ height: "30vh" }} />
          {lines.map((line, i) => (
            <Box
              key={i}
              ref={i === activeIndex ? activeLineRef : undefined}
              sx={{ textAlign: "center", py: 0.8 }}
            >
              <Typography
                sx={{
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
                }}
              >
                {line.text}
              </Typography>
            </Box>
          ))}
          <Box sx={{ height: "30vh" }} />
        </Box>
      )}
    </Box>
  );
};

export default LyricsPanel;

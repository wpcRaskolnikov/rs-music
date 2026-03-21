import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { getVersion } from "@tauri-apps/api/app";
import { useAtom } from "jotai";
import { shortcutsAtom, defaultShortcuts } from "../store";
import type { Shortcuts } from "../store";

const SHORTCUT_LABELS: Record<keyof Shortcuts, string> = {
  playPause: "播放 / 暂停",
  mute: "静音切换",
  volumeUp: "音量增加",
  volumeDown: "音量减少",
  prevSong: "上一曲",
  nextSong: "下一曲",
};

function formatKeyCode(code: string): string {
  const map: Record<string, string> = {
    Space: "Space",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Escape: "Esc",
    Enter: "Enter",
    Backspace: "Backspace",
    Tab: "Tab",
    CapsLock: "CapsLock",
  };
  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num${code.slice(6)}`;
  return code;
}

const Setting: React.FC = () => {
  const [version, setVersion] = useState("");
  const [shortcuts, setShortcuts] = useAtom(shortcutsAtom);
  const [recording, setRecording] = useState<keyof Shortcuts | null>(null);

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  const conflictKey = (key: keyof Shortcuts, code: string) =>
    (Object.keys(shortcuts) as Array<keyof Shortcuts>).find(
      (k) => k !== key && shortcuts[k] === code,
    );

  return (
    <Box sx={{ padding: 2, overflowY: "auto", height: "100%" }}>
      {/* 快捷键 */}
      <Box display="flex" alignItems="center" gap={3} mb={1}>
        <Typography variant="h6">快捷键</Typography>
        <Button
          variant="outlined"
          size="small"
          endIcon={<RestartAltIcon />}
          onClick={() => setShortcuts(defaultShortcuts)}
        >
          全部重置
        </Button>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1,
          mb: 1,
          maxWidth: 780,
        }}
      >
        {(Object.keys(SHORTCUT_LABELS) as Array<keyof Shortcuts>).map((key) => {
          const conflict = conflictKey(key, shortcuts[key]);
          const isRecording = recording === key;
          return (
            <Box key={key} display="flex" alignItems="center" gap={1}>
              <Typography sx={{ width: 90, flexShrink: 0 }} variant="body2">
                {SHORTCUT_LABELS[key]}
              </Typography>
              <Tooltip
                title={
                  isRecording
                    ? "按下任意键，Esc 取消"
                    : conflict
                      ? `与「${SHORTCUT_LABELS[conflict]}」冲突`
                      : "点击修改"
                }
              >
                <Chip
                  tabIndex={0}
                  label={
                    isRecording ? "按下按键..." : formatKeyCode(shortcuts[key])
                  }
                  onClick={(e) => {
                    if (e.detail === 0) return;
                    setRecording(isRecording ? null : key);
                  }}
                  onKeyDown={(e) => {
                    if (!isRecording) return;
                    e.preventDefault();
                    if (e.code !== "Escape") {
                      setShortcuts({ ...shortcuts, [key]: e.code });
                    }
                    setRecording(null);
                  }}
                  onBlur={() => {
                    if (isRecording) setRecording(null);
                  }}
                  color={
                    isRecording ? "primary" : conflict ? "warning" : "default"
                  }
                  variant={isRecording ? "filled" : "outlined"}
                  sx={{ width: 90, cursor: "pointer", fontFamily: "monospace" }}
                />
              </Tooltip>
              <Tooltip title="重置为默认">
                <IconButton
                  size="small"
                  disabled={shortcuts[key] === defaultShortcuts[key]}
                  onClick={() =>
                    setShortcuts({
                      ...shortcuts,
                      [key]: defaultShortcuts[key],
                    })
                  }
                >
                  <RestartAltIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}
      </Box>
      <Divider sx={{ mt: 2, mb: 2 }} />

      {/* 备份与恢复 */}
      <Typography variant="h6" gutterBottom>
        备份与恢复
      </Typography>
      <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Button variant="outlined" size="small">
          导入设置
        </Button>
        <Button variant="outlined" size="small">
          导出设置
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        rs-music v{version}
      </Typography>
    </Box>
  );
};

export default Setting;

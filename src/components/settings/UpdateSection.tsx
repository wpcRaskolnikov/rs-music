import { useState } from "react";
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, LinearProgress, Typography,
} from "@mui/material";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export default function UpdateSection({ version }: { version: string }) {
  const [update, setUpdate] = useState<Update | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function checkForUpdate() {
    setChecking(true);
    setError("");
    setMessage("");
    try {
      const available = await check();
      setUpdate(available);
      if (!available) setMessage("已是最新版本");
    } catch (err) {
      setError(`检查更新失败：${String(err)}`);
    } finally {
      setChecking(false);
    }
  }

  async function installUpdate() {
    if (!update) return;
    setInstalling(true);
    setError("");
    setProgress(null);
    let downloaded = 0;
    let total = 0;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
          downloaded = 0;
          setProgress(total > 0 ? 0 : null);
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setProgress(total > 0 ? Math.min(100, downloaded / total * 100) : null);
        } else if (event.event === "Finished") {
          setProgress(null);
        }
      });
      await relaunch();
    } catch (err) {
      setError(`更新失败：${String(err)}`);
      setInstalling(false);
    }
  }

  return (
    <>
      <Box display="flex" alignItems="center" gap={3} mb={1}>
        <Typography variant="h6">
          关于与更新
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={checkForUpdate}
          disabled={checking || update !== null}
        >
          {checking ? "正在检查…" : "检查更新"}
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        rs-music v{version}
      </Typography>

      <Box sx={{ minHeight: 48, pt: 1 }}>
        {message && <Typography variant="body2" color="text.secondary">{message}</Typography>}
        {error && <Alert severity="error" sx={{ overflowWrap: "anywhere" }}>{error}</Alert>}
      </Box>

      <Dialog
        open={update !== null}
        onClose={() => !installing && setUpdate(null)}
        disableEscapeKeyDown={installing}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>发现新版本 v{update?.version}</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {update?.body || "此版本未提供更新说明。"}
          </Typography>

          {installing && (
            <Box sx={{ mt: 2 }} >
              <Typography variant="body2" sx={{ mb: 1 }}>
                正在下载并安装更新…
                {progress !== null && ` ${Math.floor(progress)}%`}
              </Typography>
              <LinearProgress
                aria-label="更新进度"
                variant={progress !== null ? "determinate" : "indeterminate"}
                value={progress ?? 0}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdate(null)} disabled={installing}>
            稍后
          </Button>
          <Button variant="contained" onClick={installUpdate} disabled={installing}>
            {installing ? "正在安装…" : "更新并重启"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, LinearProgress, Typography,
} from "@mui/material";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type Status = "idle" | "checking" | "downloading" | "installing" | "restarting";

export default function UpdateSection({ version }: { version: string }) {
  const [update, setUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const resource = useRef<Update | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (!busy.current) void resource.current?.close().catch(console.error);
    };
  }, []);

  async function checkForUpdate() {
    if (busy.current) return;
    busy.current = true;
    setStatus("checking");
    setError("");
    setMessage("");
    try {
      const available = await check();
      if (!mounted.current) {
        await available?.close();
        return;
      }
      resource.current = available;
      setUpdate(available);
      if (!available) setMessage("已是最新版本");
    } catch (err) {
      setError(`检查更新失败：${String(err)}`);
    } finally {
      busy.current = false;
      setStatus("idle");
    }
  }

  function dismissUpdate() {
    if (busy.current) return;
    void resource.current?.close().catch(console.error);
    resource.current = null;
    setUpdate(null);
  }

  async function installUpdate() {
    if (!update || busy.current) return;
    busy.current = true;
    setError("");
    setProgress(null);
    setStatus("downloading");
    let downloaded = 0;
    let total = 0;
    let installed = false;
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
          setStatus("installing");
        }
      });
      installed = true;
      setStatus("restarting");
      await relaunch();
    } catch (err) {
      setError(installed
        ? `更新已安装，请手动重启应用：${String(err)}`
        : `更新失败：${String(err)}`);
    } finally {
      await update.close().catch(console.error);
      resource.current = null;
      setUpdate(null);
      busy.current = false;
      setStatus("idle");
    }
  }

  const installing = status === "downloading" || status === "installing" || status === "restarting";
  const statusText = status === "downloading"
    ? progress === null ? "正在下载更新…" : `正在下载更新… ${Math.floor(progress)}%`
    : status === "installing" ? "正在安装更新…" : "正在重启…";

  return (
    <Box component="section" aria-labelledby="about-update-title">
      <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 1 }}>
        <Typography id="about-update-title" variant="h6">
          关于与更新
        </Typography>
        <Button variant="outlined" size="small" onClick={checkForUpdate}
          disabled={status !== "idle" || update !== null}>
          {status === "checking" ? "正在检查…" : "检查更新"}
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        rs-music v{version}
      </Typography>
      <Box aria-live="polite" sx={{ minHeight: 48, pt: 1 }}>
        {message && <Typography variant="body2" color="text.secondary">{message}</Typography>}
        {error && <Alert severity="error" sx={{ overflowWrap: "anywhere" }}>{error}</Alert>}
      </Box>
      <Dialog open={update !== null} onClose={dismissUpdate} disableEscapeKeyDown={installing} fullWidth maxWidth="sm">
        <DialogTitle>发现新版本 v{update?.version}</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {update?.body || "此版本未提供更新说明。"}
          </Typography>
          {installing && <Box sx={{ mt: 2 }} aria-live="polite">
            <Typography variant="body2" sx={{ mb: 1 }}>{statusText}</Typography>
            <LinearProgress aria-label="更新进度"
              variant={status === "downloading" && progress !== null ? "determinate" : "indeterminate"}
              value={progress ?? 0} />
          </Box>}
        </DialogContent>
        <DialogActions>
          <Button onClick={dismissUpdate} disabled={installing}>稍后</Button>
          <Button variant="contained" onClick={installUpdate} disabled={installing}>
            更新并重启
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

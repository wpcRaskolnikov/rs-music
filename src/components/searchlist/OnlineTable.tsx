import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import {
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TablePagination,
  Table,
  TableHead,
  Chip,
} from "@mui/material";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import DownloadIcon from "@mui/icons-material/Download";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useAtomValue, useSetAtom } from "jotai";
import {
  downloadDirAtom,
  isPlayingAtom,
  selectedApiAtom,
  qualitiesAtom,
  searchQueryAtom,
  onlineTrackAtom
} from "../../store";
import { formatTime } from "../../utils";
import { EmptyText } from "../../components";
import type { OnlineSongInfo, Source } from "../../utils/musicSearch/types";
import { useOnlineSearch } from "../../utils/musicSearch";
import { LIMIT as WY_LIMIT } from "../../utils/musicSearch/wy";
import { downloadSong } from "../../utils/download";
import type { Quality } from "../../utils/download";

const qualityLabels: Record<Quality, string> = {
  "128k": "标准音质 (128k)",
  "192k": "中高音质 (192k)",
  "320k": "高音质 (320k)",
  flac: "无损音质 (FLAC)",
  flac24bit: "高解析无损 (FLAC 24bit)",
};
const getPageLimit = (s: Source | null): number => (s === "wy" ? WY_LIMIT : 50);

export interface OnlineTableProps {
  source: Source | null;
}

export default function OnlineTable({ source }: OnlineTableProps) {
  const query = useAtomValue(searchQueryAtom);
  const downloadDir = useAtomValue(downloadDirAtom);
  const selectedApi = useAtomValue(selectedApiAtom);
  const qualitiesMap = useAtomValue(qualitiesAtom);
  const setIsPlaying = useSetAtom(isPlayingAtom);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [pendingSong, setPendingSong] = useState<OnlineSongInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const setOnlineTrack = useSetAtom(onlineTrackAtom);

  useEffect(() => {
    setPage(1);
  }, [source]);

  const { data, error, isFetching, isPlaceholderData } = useOnlineSearch({
    source,
    keyword: query.trim(),
    page,
  });

  if (error) {
    return (
      <Chip
        icon={<ErrorOutlineIcon />}
        label={error.message}
        color="error"
        variant="outlined"
      />
    );
  }

  const isStale = isFetching || isPlaceholderData;
  const songs: OnlineSongInfo[] = data?.songs ?? [];
  const total = data?.total ?? 0;

  const handleDownload = (song: OnlineSongInfo) => {
    setPendingSong(song);
    setOpen(true);
  };
  const handleDownloadWithQuality = async (quality: Quality) => {
    if (!selectedApi) {
      alert("请先在设置中导入并选择一个音源");
      return;
    }

    if (!pendingSong) return;
    const id = `${pendingSong.src}:${pendingSong.id}`;
    setDownloading((prev) => new Set(prev).add(id));
    setOpen(false);

    try {
      await downloadSong(pendingSong, quality, downloadDir);
    } catch (e: any) {
      console.error("Download failed:", e);
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      alert(`下载失败: ${e.message || e}`);
    }
  };

  const handlePlay = async (song: OnlineSongInfo) => {
    if (!selectedApi) {
      alert("请先在设置中导入并选择一个音源");
      return;
    }
    setOnlineTrack({
        src: `${song.src}:${song.id}`,
        title: song.title,
        artist: song.artist,
        album: song.album || "在线音乐",
        duration: song.duration,
      });

    const url = await invoke<string>("get_music_url", {
      id: song.id,
      platform: song.src,
      quality: "128k",
    });
    setIsPlaying(true);
    await invoke("play_online_music", { url });
  };

  if (!query.trim()) {
    return <EmptyText text="输入关键词搜索在线音源" />;
  }

  if (songs.length <= 0) {
    return <EmptyText text="无搜索结果" />;
  }

  return (
    <>
      <Table
        size="small"
        stickyHeader
        sx={{
          opacity: isStale ? 0.5 : 1,
          pointerEvents: isStale ? "none" : "auto",
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: "auto" }}>歌曲名</TableCell>
            <TableCell sx={{ width: "15%" }}>歌手</TableCell>
            <TableCell sx={{ width: "15%" }}>专辑</TableCell>
            <TableCell sx={{ width: "15%" }}>操作</TableCell>
            <TableCell sx={{ width: "10%" }}>时长</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {songs.map((song) => (
            <TableRow key={`${song.src}:${song.id}`} hover>
              <TableCell>{song.title}</TableCell>
              <TableCell>{song.artist}</TableCell>
              <TableCell>{song.album}</TableCell>
              <TableCell>
                <Tooltip title="播放">
                  <IconButton
                    size="small"
                    onClick={() => handlePlay(song)}
                  >
                    <HeadphonesIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="下载">
                  <IconButton
                    size="small"
                    disabled={downloading.has(`${song.src}:${song.id}`)}
                    onClick={() => handleDownload(song)}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
              <TableCell>{formatTime(song.duration)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        rowsPerPage={getPageLimit(source)}
        rowsPerPageOptions={[]}
        onPageChange={(_, newPage) => {
          setPage(newPage + 1);
        }}
        showFirstButton
        showLastButton
      />
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>选择音质</DialogTitle>
        <DialogContent>
          <List>
            {(() => {
              const qs = qualitiesMap[pendingSong?.src ?? ""] ?? [];
              const order: Quality[] = ["128k", "192k", "320k", "flac", "flac24bit"];
              const valid = order.filter((q) => qs.includes(q));
              if (valid.length === 0) {
                return <ListItem disablePadding><ListItemText primary="未获取到音质列表" /></ListItem>;
              }
              return valid.map((q) => (
                <ListItem key={q} disablePadding>
                  <ListItemButton onClick={() => handleDownloadWithQuality(q)}>
                    <ListItemText primary={qualityLabels[q]} />
                  </ListItemButton>
                </ListItem>
              ));
            })()}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

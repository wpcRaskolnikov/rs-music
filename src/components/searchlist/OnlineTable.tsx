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
import DownloadIcon from "@mui/icons-material/Download";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useAtomValue } from "jotai";
import {
  downloadDirAtom,
  userApiListAtom,
  selectedApiIdAtom,
  searchQueryAtom,
} from "../../store";
import { formatTime } from "../../utils";
import { EmptyText } from "../../components";
import type { OnlineSongInfo, Source } from "../../utils/musicSearch/types";
import { useOnlineSearch } from "../../utils/musicSearch/hooks";
import { LIMIT as WY_LIMIT } from "../../utils/musicSearch/wy";
import { downloadSong } from "../../utils/download";
import type { Quality } from "../../utils/download";

const qualities: Quality[] = ["128k", "320k", "flac", "flac24bit"];
const qualityLabels: Record<Quality, string> = {
  "128k": "标准音质 (128k)",
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
  const userApiList = useAtomValue(userApiListAtom);
  const selectedApiId = useAtomValue(selectedApiIdAtom);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [pendingSong, setPendingSong] = useState<OnlineSongInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

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
    if (!selectedApiId) {
      alert("请先在设置中导入并选择一个音源");
      return;
    }
    const api = userApiList.find((a) => a.id === selectedApiId);
    if (!api) {
      alert("未找到选中的音源脚本");
      return;
    }

    if (!pendingSong) return;
    const id = `${pendingSong.src}:${pendingSong.id}`;
    setDownloading((prev) => new Set(prev).add(id));
    setOpen(false);

    try {
      await downloadSong(api.scriptContent, pendingSong, quality, downloadDir);
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
            <TableCell sx={{ width: "10%" }}>操作</TableCell>
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
            {qualities.map((q) => (
              <ListItem key={q} disablePadding>
                <ListItemButton onClick={() => handleDownloadWithQuality(q)}>
                  <ListItemText primary={qualityLabels[q]} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

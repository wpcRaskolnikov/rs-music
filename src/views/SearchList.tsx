import React, {
  useDeferredValue,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Tooltip,
  Skeleton,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import DownloadIcon from "@mui/icons-material/Download";
import { EmptyText } from "../components";
import { invoke } from "@tauri-apps/api/core";
import { useAtomValue, useSetAtom } from "jotai";
import { MusicMetadata, getDb, searchQueryAtom, isPlayingAtom, downloadDirAtom, userApiListAtom, selectedApiIdAtom } from "../store";
import { formatTime } from "../utils";
import { sourceNameMap } from "../utils/musicSearch/types";
import type { Source } from "../utils/musicSearch/types";
import { useOnlineSearch } from "../utils/musicSearch/hooks";
import { LIMIT as WY_LIMIT } from "../utils/musicSearch/wy";
import { downloadSong, onDownloadStatusUpdate } from "../utils/download";
import type { Quality } from "../utils/download";

interface SearchResult extends MusicMetadata {
  playlist_id: string;
  playlist_label: string;
}

const onlineSources: Source[] = ["kw", "kg", "tx", "wy", "mg"];

const tabs = ["本地", ...onlineSources.map((s) => sourceNameMap[s])];

const getPageLimit = (s: Source | null): number => (s === "wy" ? WY_LIMIT : 50);

interface SearchTableProps {
  header: React.ReactNode;
  showSource: boolean;
  body: React.ReactNode;
  pagination?: React.ReactNode;
  opacity?: number;
}

function SearchTable({
  header,
  showSource,
  body,
  pagination,
  opacity,
}: SearchTableProps) {
  return (
    <Box
      sx={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {header}
      <TableContainer
        sx={{
          flex: 1,
          minHeight: 0,
          ...(opacity !== undefined && {
            opacity,
            transition: "opacity 0.15s ease",
          }),
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>歌曲名</TableCell>
              <TableCell>歌手</TableCell>
              <TableCell>专辑</TableCell>
              {showSource && <TableCell>来源</TableCell>}
              <TableCell align="center">操作</TableCell>
              <TableCell>时长</TableCell>
            </TableRow>
          </TableHead>
          {body}
        </Table>
      </TableContainer>
      {pagination}
    </Box>
  );
}

const SearchList: React.FC = () => {
  const query = useAtomValue(searchQueryAtom);
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;
  const [results, setResults] = useState<SearchResult[]>([]);
  const setIsPlaying = useSetAtom(isPlayingAtom);
  const [tabValue, setTabValue] = useState(0);
  const [onlinePage, setOnlinePage] = useState<Record<Source, number>>({
    kw: 1,
    kg: 1,
    tx: 1,
    wy: 1,
    mg: 1,
  });
  const downloadDir = useAtomValue(downloadDirAtom);
  const userApiList = useAtomValue(userApiListAtom);
  const selectedApiId = useAtomValue(selectedApiIdAtom);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const unlistenRef = useRef<(() => void)[]>([]);

  // Quality selection dialog state
  const [qualityDialog, setQualityDialog] = useState<{
    open: boolean;
    song: { id: string; name: string; artist: string; album: string; source: Source } | null;
  }>({ open: false, song: null });
  const qualities: Quality[] = ["128k", "320k", "flac", "flac24bit"];

  // Listen to download events
  useEffect(() => {
    const listeners = [
      onDownloadStatusUpdate(({ id, status }) => {
        if (status.type === "completed" || status.type === "error") {
          setDownloading((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }),
    ];

    Promise.all(listeners).then((unlistens) => {
      unlistenRef.current = unlistens;
    });

    return () => {
      unlistenRef.current.forEach((unlisten) => unlisten());
      unlistenRef.current = [];
    };
  }, []);

  useEffect(() => {
    const source = onlineSources[tabValue - 1];
    if (source) {
      setOnlinePage((prev) => ({ ...prev, [source]: 1 }));
    }
    if (tabValue !== 0 || !deferredQuery.trim()) {
      setResults([]);
      return;
    }
    const keyword = `%${deferredQuery.trim()}%`;
    (async () => {
      const db = await getDb();
      const rows = await db.select<SearchResult[]>(
        `SELECT m.src, m.title, m.artist, m.album, m.duration, m.playlist_id,
                COALESCE(p.label, m.playlist_id) AS playlist_label
         FROM music m
         LEFT JOIN playlist p ON m.playlist_id = p.playlist_id
         WHERE m.title LIKE ? OR m.artist LIKE ? OR m.album LIKE ?
         ORDER BY m.title`,
        [keyword, keyword, keyword],
      );
      setResults(rows);
    })();
  }, [deferredQuery, tabValue]);


  const source = onlineSources[tabValue - 1];
  const { data, isLoading, error } = useOnlineSearch({
    source,
    keyword: deferredQuery.trim(),
    page: source ? onlinePage[source] : 1,
  });

  const handlePlay = async (result: SearchResult) => {
    const db = await getDb();
    const rows = await db.select<{ idx: number }[]>(
      "SELECT idx FROM (SELECT src, ROW_NUMBER() OVER (ORDER BY sort_order) - 1 AS idx FROM music WHERE playlist_id = ?) WHERE src = ?",
      [result.playlist_id, result.src],
    );
    if (rows.length > 0) {
      setIsPlaying(true);
      invoke("play_music", {
        playlistId: result.playlist_id,
        index: rows[0].idx,
      });
    }
  };

  const handleDownload = (song: { id: string; name: string; artist: string; album: string; source: Source }) => {
    setQualityDialog({ open: true, song });
  };

  const handleDownloadWithQuality = async (quality: Quality) => {
    if (!qualityDialog.song) return;
    const song = qualityDialog.song;

    const apiId = selectedApiId;
    if (!apiId) {
      alert("请先在设置中导入并选择一个音源");
      return;
    }
    if (!downloadDir) {
      alert("请先在设置中选择下载目录");
      return;
    }

    const api = userApiList.find((a) => a.id === apiId);
    if (!api) {
      alert("未找到选中的音源脚本");
      return;
    }

    const id = `${song.source}:${song.id}`;
    setDownloading((prev) => new Set(prev).add(id));
    setQualityDialog({ open: false, song: null });

    try {
      await downloadSong(
        api.scriptContent,
        song.source,
        song.id,
        song.name,
        song.artist,
        song.album,
        quality,
        downloadDir,
      );
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

  const header = (
    <Tabs
      value={tabValue}
      onChange={(_, v) => setTabValue(v)}
      sx={{ px: 2, pt: 1 }}
      variant="scrollable"
      scrollButtons="auto"
    >
      {tabs.map((label) => (
        <Tab key={label} label={label} />
      ))}
    </Tabs>
  );

  if (tabValue === 0) {
    if (!query.trim()) {
      return (
        <Box
          sx={{
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {header}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyText text="输入关键词搜索本地歌曲" />
          </Box>
        </Box>
      );
    }

    if (!results.length && !isStale) {
      return (
        <Box
          sx={{
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {header}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyText text="无搜索结果" />
          </Box>
        </Box>
      );
    }

    return (
      <SearchTable
        header={header}
        showSource
        opacity={isStale ? 0.5 : 1}
        body={
          <TableBody>
            {results.map((item) => (
              <TableRow
                key={`${item.playlist_id}:${item.src}`}
                hover
                onDoubleClick={() => handlePlay(item)}
              >
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.artist}</TableCell>
                <TableCell>{item.album}</TableCell>
                <TableCell>
                  <Chip
                    label={item.playlist_label}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handlePlay(item)}>
                    <HeadphonesIcon fontSize="small" />
                  </IconButton>
                </TableCell>
                <TableCell>{formatTime(item.duration)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        }
      />
    );
  }

  const songs = data?.songs ?? [];
  const total = data?.total ?? 0;

  if (isLoading) {
    return (
      <SearchTable
        header={header}
        showSource={false}
        body={
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
                <TableCell align="center">
                  <Skeleton variant="circular" width={24} height={24} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        }
      />
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {header}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Chip
            icon={<ErrorOutlineIcon />}
            label={error.message}
            color="error"
            variant="outlined"
          />
        </Box>
      </Box>
    );
  }

  if (!deferredQuery.trim() || !songs.length) {
    return (
      <Box
        sx={{
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {header}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <EmptyText
            text={
              deferredQuery.trim() ? "无搜索结果" : "输入关键词搜索在线音源"
            }
          />
        </Box>
      </Box>
    );
  }

  return (
    <>
    <SearchTable
      header={header}
      showSource={false}
      body={
        <TableBody>
          {songs.map((song) => (
            <TableRow key={`${song.source}:${song.id}`} hover>
              <TableCell>{song.name}</TableCell>
              <TableCell>{song.artist}</TableCell>
              <TableCell>{song.album}</TableCell>
              <TableCell align="center">
                {downloading.has(`${song.source}:${song.id}`) ? (
                  <Tooltip title="下载中">
                    <span>
                      <IconButton size="small" disabled>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="下载">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(song)}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell>{formatTime(song.duration)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      }
      pagination={
        source &&
        total > getPageLimit(source) && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
            <Pagination
              count={Math.ceil(total / getPageLimit(source))}
              page={onlinePage[source]}
              onChange={(_: React.ChangeEvent<unknown>, page: number) => {
                const s = onlineSources[tabValue - 1];
                if (s) setOnlinePage((prev) => ({ ...prev, [s]: page }));
              }}
              siblingCount={0}
              boundaryCount={1}
            />
          </Box>
        )
      }
    />

    {/* Quality Selection Dialog */}
    <Dialog
      open={qualityDialog.open}
      onClose={() => setQualityDialog({ open: false, song: null })}
    >
      <DialogTitle>选择音质</DialogTitle>
      <DialogContent>
        <List>
          {qualities.map((q) => (
            <ListItem key={q} disablePadding>
              <ListItemButton onClick={() => handleDownloadWithQuality(q)}>
                <ListItemText
                  primary={
                    q === "128k" ? "标准音质 (128k)" :
                    q === "320k" ? "高音质 (320k)" :
                    q === "flac" ? "无损音质 (FLAC)" :
                    "高解析无损 (FLAC 24bit)"
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setQualityDialog({ open: false, song: null })}>
          取消
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default SearchList;

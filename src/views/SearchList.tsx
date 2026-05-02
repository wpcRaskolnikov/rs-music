import React, { useDeferredValue, useEffect, useState } from "react";
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
  Typography,
} from "@mui/material";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import { EmptyText } from "../components";
import { invoke } from "@tauri-apps/api/core";
import { useAtomValue, useSetAtom } from "jotai";
import { MusicMetadata, getDb, searchQueryAtom, isPlayingAtom } from "../store";
import { formatTime } from "../utils";

interface SearchResult extends MusicMetadata {
  playlist_id: string;
  playlist_label: string;
}

const SearchList: React.FC = () => {
  const query = useAtomValue(searchQueryAtom);
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;
  const [results, setResults] = useState<SearchResult[]>([]);
  const setIsPlaying = useSetAtom(isPlayingAtom);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (!deferredQuery.trim()) {
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
  }, [deferredQuery]);

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

  const showLocal = tabValue === 0;
  const showOnline = tabValue === 1;

  const header = (
    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ px: 2, pt: 1 }}>
      <Tab label="本地" />
      <Tab label="在线" />
    </Tabs>
  );

  if (showOnline) {
    return (
      <Box sx={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {header}
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="text.secondary">
            音源搜索功能尚未实现，敬请期待
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!query.trim()) {
    return (
      <Box sx={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {header}
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyText text="输入关键词搜索本地歌曲" />
        </Box>
      </Box>
    );
  }

  if (!results.length && !isStale) {
    return (
      <Box sx={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {header}
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyText text="无搜索结果" />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {header}
      {tabValue === 0 && (
        <TableContainer
          sx={{
            flex: 1,
            minHeight: 0,
            opacity: isStale ? 0.5 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>歌曲名</TableCell>
                <TableCell>歌手</TableCell>
                <TableCell>专辑</TableCell>
                <TableCell>来源</TableCell>
                <TableCell align="center">操作</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>时长</TableCell>
              </TableRow>
            </TableHead>
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
          </Table>
        </TableContainer>
      )}
      {tabValue === 1 && (
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="text.secondary">
            音源搜索功能尚未实现，敬请期待
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SearchList;

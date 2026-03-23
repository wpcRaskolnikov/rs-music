import React, { useEffect, useState } from "react";
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
  const [results, setResults] = useState<SearchResult[]>([]);
  const setIsPlaying = useSetAtom(isPlayingAtom);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const keyword = `%${query.trim()}%`;
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
  }, [query]);

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

  if (!query.trim()) {
    return <EmptyText text="输入关键词搜索本地歌曲" />;
  }

  if (!results.length) {
    return <EmptyText text="无搜索结果" />;
  }

  return (
    <Box sx={{ height: "100%", overflow: "hidden", p: 2 }}>
      <TableContainer sx={{ height: "100%" }}>
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
    </Box>
  );
};

export default SearchList;

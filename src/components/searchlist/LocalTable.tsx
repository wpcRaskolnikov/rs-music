import { useState, useEffect } from "react";
import {
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Table,
  TableHead,
} from "@mui/material";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import { invoke } from "@tauri-apps/api/core";
import { useAtomValue, useSetAtom } from "jotai";

import { db, isPlayingAtom, searchQueryAtom } from "../../store";
import { formatTime } from "../../utils";
import { EmptyText } from "../../components";
import type { MusicMetadata } from "../../store";

interface Song extends MusicMetadata {
  playlist_id: string;
  playlist_label: string;
}

export default function LocalTable() {
  const query = useAtomValue(searchQueryAtom);
  const setIsPlaying = useSetAtom(isPlayingAtom);
  const [results, setResults] = useState<Song[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsFetching(true);
    const keyword = `%${query.trim()}%`;
    (async () => {
      try {
        const rows = await db.select<Song[]>(
          `SELECT m.src, m.title, m.artist, m.album, m.duration, m.playlist_id,
                  COALESCE(p.label, m.playlist_id) AS playlist_label
           FROM music m
           LEFT JOIN playlist p ON m.playlist_id = p.playlist_id
           WHERE m.title LIKE ? OR m.artist LIKE ? OR m.album LIKE ?
           ORDER BY m.title`,
          [keyword, keyword, keyword],
        );
        setResults(rows);
      } finally {
        setIsFetching(false);
      }
    })();
  }, [query]);

  const handlePlay = async (result: Song) => {
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

  if (isFetching || results.length === 0) {
    return <EmptyText text={isFetching ? "搜索中..." : "无搜索结果"} />;
  }

  return (
    <Table
      size="small"
      stickyHeader
      sx={{
        opacity: isFetching ? 0.5 : 1,
        pointerEvents: isFetching ? "none" : "auto",
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: "auto" }}>歌曲名</TableCell>
          <TableCell sx={{ width: "15%" }}>歌手</TableCell>
          <TableCell sx={{ width: "15%" }}>专辑</TableCell>
          <TableCell sx={{ width: "15%" }}>来源</TableCell>
          <TableCell sx={{ width: "10%" }}>操作</TableCell>
          <TableCell sx={{ width: "10%" }}>时长</TableCell>
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
            <TableCell>
              <IconButton size="small" onClick={() => handlePlay(item)}>
                <HeadphonesIcon fontSize="small" />
              </IconButton>
            </TableCell>
            <TableCell>{formatTime(item.duration)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

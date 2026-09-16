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
import { useSetAtom } from "jotai";
import { db } from "../../store";
import { isPlayingAtom } from "../../store";
import { formatTime } from "../../utils";
import type { MusicMetadata } from "../../store";

interface Song extends MusicMetadata {
  playlist_id: string;
  playlist_label: string;
}

interface LocalTableProps {
  results: Song[];
}

export default function LocalTable({ results }: LocalTableProps) {
  const setIsPlaying = useSetAtom(isPlayingAtom);

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
  return (
    <Table size="small" stickyHeader>
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

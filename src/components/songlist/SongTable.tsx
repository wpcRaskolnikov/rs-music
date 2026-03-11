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
} from "@mui/material";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import DeleteIcon from "@mui/icons-material/Delete";
import EmptyText from "../EmptyText";
import { isPlayingAtom } from "../../store";
import { useSetAtom } from "jotai";
import { MusicMetadata } from "../../store";
import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import { formatTime } from "../../utils";

const SongTable: React.FC<{
  playlistId: string;
}> = ({ playlistId }) => {
  const [list, setList] = useState<MusicMetadata[]>([]);
  const setIsPlaying = useSetAtom(isPlayingAtom);

  useEffect(() => {
    if (!playlistId) return;
    (async () => {
      const db = await Database.load("sqlite:db.sqlite");
      const rows = await db.select<MusicMetadata[]>(
        "SELECT * FROM music WHERE playlist_id = ?",
        [playlistId],
      );
      setList(rows);
    })();
  }, [playlistId]);

  const handlePlay = (index: number) => {
    setIsPlaying(true);
    invoke("play_music", { playlistId, index });
  };

  const handleRemove = async (index: number) => {
    console.log("删除", list[index]);
  };

  return (
    <Box sx={{ flex: 1, height: "100%", overflow: "hidden", p: 2 }}>
      {list.length ? (
        <TableContainer sx={{ height: "100%" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>歌曲名</TableCell>
                <TableCell>歌手</TableCell>
                <TableCell>专辑</TableCell>
                <TableCell align="center">操作</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>时长</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((item, index) => (
                <TableRow
                  key={item.src}
                  hover
                  onDoubleClick={() => handlePlay(index)}
                >
                  <TableCell>{item.title}</TableCell>
                  <TableCell>{item.artist}</TableCell>
                  <TableCell>{item.album}</TableCell>
                  <TableCell align="center">
                    <Box display="flex">
                      <IconButton onClick={() => handlePlay(index)}>
                        <HeadphonesIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => handleRemove(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>{formatTime(item.duration)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyText text="暂无歌曲" />
      )}
    </Box>
  );
};

export default SongTable;

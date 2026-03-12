import React from "react";
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
import { MusicMetadata } from "../../store";
import { formatTime } from "../../utils";

const SongTable: React.FC<{
  list: MusicMetadata[];
  onPlay: (index: number) => void;
  onRemove: (src: string) => void;
}> = ({ list, onPlay, onRemove }) => {
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
                  onDoubleClick={() => onPlay(index)}
                >
                  <TableCell>{item.title}</TableCell>
                  <TableCell>{item.artist}</TableCell>
                  <TableCell>{item.album}</TableCell>
                  <TableCell align="center">
                    <Box display="flex">
                      <IconButton onClick={() => onPlay(index)}>
                        <HeadphonesIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => onRemove(item.src)}>
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

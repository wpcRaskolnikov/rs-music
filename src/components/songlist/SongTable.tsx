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
import { currentIndexAtom, triggerAtom, playListAtom } from "../../store";
import { useSetAtom } from "jotai";
import { MusicMetadata } from "../../store";

const SongTable: React.FC<{
  list: MusicMetadata[];
}> = ({ list }) => {
  const setCurrentIndex = useSetAtom(currentIndexAtom);
  const setTrigger = useSetAtom(triggerAtom);
  const setPlayList = useSetAtom(playListAtom);

  const handlePlay = (index: number) => {
    setCurrentIndex(index);
    setPlayList(list);
    setTrigger((pre) => !pre);
  };

  const handleRemove = async (index: number) => {
    console.log("删除", list[index]);
  };

  return list.length ? (
    <TableContainer sx={{ maxHeight: "100%" }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>歌曲名</TableCell>
            <TableCell>歌手</TableCell>
            <TableCell>专辑</TableCell>
            <TableCell align="center">操作</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>时长</TableCell>
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
              <TableCell>{item.duration}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  ) : (
    <EmptyText text="暂无歌曲" />
  );
};

export default SongTable;

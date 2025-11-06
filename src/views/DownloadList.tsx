import React, { useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  TableContainer,
} from "@mui/material";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import PauseIcon from "@mui/icons-material/Pause";
import DeleteIcon from "@mui/icons-material/Delete";
import { EmptyText } from "../components";

const DownloadList: React.FC = () => {
  const [list] = useState([
    {
      key: "1",
      musicInfo: { name: "夜曲", singer: "周杰伦" },
      progress: { progress: 68 },
      statusText: "下载中",
      type: "mp3",
      isComplate: false,
      isDownloading: false,
    },
  ]);

  return (
    <>
      {list.length ? (
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>歌曲名</TableCell>
                <TableCell>进度</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>品质</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((item) => (
                <TableRow key={item.key} hover>
                  <TableCell>
                    {item.musicInfo.name} - {item.musicInfo.singer}
                  </TableCell>
                  <TableCell>{item.progress.progress}%</TableCell>
                  <TableCell>{item.statusText}</TableCell>
                  <TableCell>{item.type.toUpperCase()}</TableCell>
                  <TableCell>
                    {item.isDownloading ? (
                      <IconButton>
                        <PauseIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton>
                        <HeadphonesIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyText text="暂无下载任务" />
      )}
    </>
  );
};

export default DownloadList;

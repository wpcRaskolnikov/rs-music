import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Typography,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import { EmptyText } from "../components";
import { db, downloadsAtom, type DownloadTask } from "../store";

type DownloadStatusEvent =
  | { type: "ready" }
  | { type: "completed" }
  | { type: "processing"; data: number }
  | { type: "error"; data: string };

type DownloadStatusPayload = {
  id: string;
  status: DownloadStatusEvent;
};

const statusMap: Record<
  string,
  {
    label: string;
    color: ChipProps["color"];
  }
> = {
  processing: { label: "下载中", color: "primary" },
  completed: { label: "已完成", color: "success" },
  error: { label: "失败", color: "error" },
  ready: { label: "准备中", color: "warning" },
};

const DownloadList: React.FC = () => {
  const [tasks, setTasks] = useAtom(downloadsAtom);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    db.select<DownloadTask[]>(
      "SELECT id, platform, title, artist, album, quality, url, status FROM downloads ORDER BY created_at DESC",
    ).then((list) => {
      setTasks(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const unlisten = listen<DownloadStatusPayload>(
      "download-status-update",
      ({ payload: { id, status } }) => {
        const next = (() => {
          switch (status.type) {
            case "processing":
              return { taskStatus: "processing", progress: status.data };
            case "completed":
              return { taskStatus: "completed", progress: 100 };
            case "error":
              return { taskStatus: status.data, progress: 0 };
            case "ready":
              return { taskStatus: "ready", progress: 0 };
          }
        })();

        setProgressMap((prev) => ({ ...prev, [id]: next.progress }));

        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: next.taskStatus } : t,
          ),
        );
      },
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setProgressMap(({ [id]: _, ...rest }) => rest);
    await db.execute("DELETE FROM downloads WHERE id = ?", [id]);
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (!tasks.length) {
    return <EmptyText text="暂无下载任务" />;
  }

  return (
    <Box sx={{ height: "100%", overflow: "hidden", p: 2 }}>
      <TableContainer sx={{ height: "100%" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "auto" }}>歌曲名</TableCell>
              <TableCell sx={{ width: "15%" }}>歌手</TableCell>
              <TableCell sx={{ width: "15%" }}>专辑</TableCell>
              <TableCell sx={{ width: "10%" }}>进度</TableCell>
              <TableCell sx={{ width: "15%" }}>状态</TableCell>
              <TableCell sx={{ width: "10%" }}>品质</TableCell>
              <TableCell sx={{ width: "10%" }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => {
              const statusInfo = statusMap[task.status] || {
                label: task.status,
                color: "default",
              };
              const progress =
                progressMap[task.id] ?? (task.status === "completed" ? 100 : 0);
              return (
                <TableRow key={task.id} hover>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.artist}</TableCell>
                  <TableCell>{task.album}</TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {progress.toFixed(0)}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusInfo.label}
                      size="small"
                      color={statusInfo.color}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{task.quality}</TableCell>
                  <TableCell>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(task.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DownloadList;

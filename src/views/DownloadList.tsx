import React, { useState, useEffect, useCallback } from "react";
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
  CircularProgress,
  Typography,
} from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import DeleteIcon from "@mui/icons-material/Delete";
import { EmptyText } from "../components";
import { getDownloads, cancelDownload, onDownloadStatusUpdate } from "../utils/download";
import type { DownloadTask } from "../utils/download";
import { Tooltip } from "@mui/material";

const statusMap: Record<string, { label: string; color: "default" | "primary" | "success" | "error" | "warning" }> = {
  downloading: { label: "下载中", color: "primary" },
  completed: { label: "已完成", color: "success" },
  error: { label: "失败", color: "error" },
  cancelled: { label: "已取消", color: "default" },
  pending: { label: "等待中", color: "warning" },
};

const DownloadList: React.FC = () => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  // Load initial list
  useEffect(() => {
    getDownloads().then((list) => {
      setTasks(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Listen to events
  useEffect(() => {
    const updateTask = (id: string, updater: (t: DownloadTask) => DownloadTask) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
    };

    const listeners = [
      onDownloadStatusUpdate(({ id, status }) => {
        switch (status.type) {
          case "processing":
            setProgressMap((prev) => ({ ...prev, [id]: status.data }));
            updateTask(id, (t) => ({ ...t, status: "downloading" }));
            break;
          case "completed":
            setProgressMap((prev) => ({ ...prev, [id]: 100 }));
            updateTask(id, (t) => ({ ...t, status: "completed" }));
            break;
          case "error":
            updateTask(id, (t) => ({ ...t, status: "error" }));
            break;
        }
      }),
    ];

    return () => {
      listeners.forEach((unlisten) => unlisten.then((u) => u()));
    };
  }, []);

  const handleCancel = useCallback(async (id: string) => {
    await cancelDownload(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "cancelled" } : t)));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setProgressMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  if (loading) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!tasks.length) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <EmptyText text="暂无下载任务" />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", overflow: "hidden", p: 2 }}>
      <TableContainer sx={{ height: "100%" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>歌曲名</TableCell>
              <TableCell>歌手</TableCell>
              <TableCell>进度</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>品质</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => {
              const statusInfo = statusMap[task.status] || { label: task.status, color: "default" };
              const progress = progressMap[task.id] ?? 0;
              return (
                <TableRow key={task.id} hover>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.artist}</TableCell>
                  <TableCell>
                    <Typography variant="caption">{progress.toFixed(0)}%</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={statusInfo.label} size="small" color={statusInfo.color} variant="outlined" />
                  </TableCell>
                  <TableCell>{task.quality}</TableCell>
                  <TableCell>
                    {task.status === "downloading" && (
                      <Tooltip title="暂停">
                        <IconButton size="small" onClick={() => handleCancel(task.id)}>
                          <PauseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="删除">
                      <IconButton size="small" onClick={() => handleDelete(task.id)}>
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

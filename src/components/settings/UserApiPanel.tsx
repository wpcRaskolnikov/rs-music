import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Alert,
  IconButton,
  Divider,
  Tooltip,
  Stack,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { open } from "@tauri-apps/plugin-dialog";
import { useAtom } from "jotai";
import { parseUserApiScript } from "../../utils/userApiParser";
import { userApiListAtom, selectedApiIdAtom, downloadDirAtom } from "../../store";
import type { UserApiMeta } from "../../store";

const UserApiPanel: React.FC = () => {
  const [apis, setApis] = useAtom(userApiListAtom);
  const [selectedId, setSelectedId] = useAtom(selectedApiIdAtom);
  const [importOpen, setImportOpen] = useState(false);
  const [detailApi, setDetailApi] = useState<UserApiMeta | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [downloadDir, setDownloadDir] = useAtom(downloadDirAtom);

  const handleSelectDirectory = async () => {
    const selected = await open({
      multiple: false,
      directory: true,
      title: "选择下载目录",
    });
    if (selected && typeof selected === "string") {
      setDownloadDir(selected);
    }
  };

  const handleOnlineImport = async () => {
    setError("");
    if (!url.trim()) return;
    try {
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      const meta = parseUserApiScript(content);
      const hashArray = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(content),
      );
      const id = Array.from(new Uint8Array(hashArray))
        .slice(0, 8)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setApis((prev) => [...prev, { ...meta, id, scriptContent: content }]);
      setUrl("");
    } catch (e: any) {
      setError(e.message ?? "导入失败");
    }
  };

  const handleLocalImport = async () => {
    // TODO: 本地文件导入
  };

  const handleDelete = (id: string) => {
    setApis((prev) => prev.filter((api) => api.id !== id));
    if (selectedId === id) {
      setSelectedId("");
    }
  };

  const handleShowDetail = (api: UserApiMeta) => {
    setDetailApi(api);
    setDetailOpen(true);
  };


  return (
    <>
      <Typography variant="h6" gutterBottom>
        音源选择
      </Typography>
      <Box sx={{ maxWidth: 600, mb: 1 }}>
        {apis.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            暂无音源
          </Typography>
        ) : (
          apis.map((api) => (
            <Box
              key={api.id}
              sx={{
                display: "flex",
                alignItems: "center",
                marginBottom: 0.5,
                cursor: "pointer",
                padding: "4px 0",
                userSelect: "none",
              }}
              onClick={() => setSelectedId(api.id)}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="apiSource"
                  checked={selectedId === api.id}
                  onChange={() => setSelectedId(api.id)}
                  style={{ marginRight: 8 }}
                />
                <Typography>
                  {api.name}（{api.version}）
                </Typography>
              </label>
              <Tooltip title="查看详情">
                <IconButton
                  size="small"
                  sx={{ ml: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowDetail(api);
                  }}
                >
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="删除">
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(api.id);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={() => setImportOpen(true)}
        >
          在线导入
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<FolderOpenIcon />}
          onClick={handleLocalImport}
        >
          本地导入
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Stack spacing={0}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          下载目录
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            placeholder="请选择下载目录"
            value={downloadDir}
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
            size="small"
            title={downloadDir}
          />
          <IconButton color="primary" onClick={handleSelectDirectory} size="medium" title="选择目录">
            <FolderOpenIcon />
          </IconButton>
        </Box>
      </Stack>

      {/* 在线导入对话框 */}
      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>在线导入音源</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={1} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="输入音源脚本 URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleOnlineImport();
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleOnlineImport}
                        disabled={!url.trim()}
                      >
                        导入
                      </Button>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 音源详情对话框 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>音源详情</DialogTitle>
        <DialogContent>
          {detailApi && (
            <>
              <Box sx={{ py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  名称
                </Typography>
                <Typography>{detailApi.name}</Typography>
              </Box>
              <Divider />
              <Box sx={{ py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  作者
                </Typography>
                <Typography>{detailApi.author}</Typography>
              </Box>
              <Divider />
              <Box sx={{ py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  版本
                </Typography>
                <Typography>{detailApi.version}</Typography>
              </Box>
              <Divider />
              <Box sx={{ py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  描述
                </Typography>
                <Typography>{detailApi.description}</Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserApiPanel;

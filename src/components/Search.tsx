import React from "react";
import { Box, TextField, IconButton } from "@mui/material";
import MinimizeIcon from "@mui/icons-material/Minimize";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import CloseIcon from "@mui/icons-material/Close";
import { getCurrentWindow } from "@tauri-apps/api/window";

const Search: React.FC = () => {
  return (
    <Box
      data-tauri-drag-region
      height="50px"
      display="flex"
      alignItems="center"
      paddingX={2}
      borderBottom="1px solid #ddd"
    >
      <TextField
        placeholder="搜索"
        size="small"
        variant="outlined"
        sx={{ width: 200, bgcolor: "#e8f5e9", borderRadius: 1 }}
      />
      <Box flex={1} />

      {/* 窗口控制按钮 */}
      <Box display="flex" gap={1}>
        <IconButton
          onClick={() => {
            getCurrentWindow().minimize();
          }}
        >
          <MinimizeIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={() => {
            getCurrentWindow().toggleMaximize();
          }}
        >
          <CropSquareIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={() => {
            getCurrentWindow().close();
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Search;

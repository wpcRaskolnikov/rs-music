import React from "react";
import { Box, TextField, IconButton, InputAdornment } from "@mui/material";
import MinimizeIcon from "@mui/icons-material/Minimize";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import CloseIcon from "@mui/icons-material/Close";
import ClearIcon from "@mui/icons-material/Clear";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAtom } from "jotai";
import { useNavigate, useLocation } from "react-router";
import { searchQueryAtom } from "../store";

const Search: React.FC = () => {
  const [query, setQuery] = useAtom(searchQueryAtom);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (location.pathname !== "/search") navigate("/search");
  };

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
        value={query}
        onChange={handleChange}
        sx={{ width: 200, bgcolor: "#e8f5e9", borderRadius: 1 }}
        slotProps={{
          input: {
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setQuery("")}
                  edge="end"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
      />
      <Box flex={1} />

      {/* 窗口控制按钮 */}
      <Box display="flex" gap={1}>
        <IconButton
          onClick={() => {
            getCurrentWindow().hide();
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

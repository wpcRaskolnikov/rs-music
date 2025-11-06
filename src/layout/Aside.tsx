import React from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  Tooltip,
  Typography,
} from "@mui/material";
import { NavLink } from "react-router";

// MUI Icons
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import DownloadIcon from "@mui/icons-material/Download";
import SettingsIcon from "@mui/icons-material/Settings";

const menuItems = [
  { label: "搜索", path: "/search", icon: <SearchIcon /> },
  { label: "排行榜", path: "/ranking", icon: <BarChartIcon /> },
  { label: "列表", path: "/songlist", icon: <QueueMusicIcon /> },
  { label: "下载管理", path: "/download", icon: <DownloadIcon /> },
  { label: "设置", path: "/setting", icon: <SettingsIcon /> },
];

const Aside: React.FC = () => {
  return (
    <Box
      data-tauri-drag-region
      width="60px"
      bgcolor="#2e7d32"
      color="white"
      display="flex"
      flexDirection="column"
      alignItems="center"
      paddingTop={2}
      height="100vh"
    >
      {/* 左上角 RS Logo */}
      <Box mb={2}>
        <Typography
          variant="h6"
          fontWeight="bold"
          letterSpacing={2}
          textAlign="center"
        >
          RS
        </Typography>
      </Box>

      {/* 菜单图标 */}
      <List>
        {menuItems.map((item) => (
          <Tooltip key={item.label} title={item.label} placement="right">
            <NavLink
              to={item.path}
              style={({ isActive }) => ({
                textDecoration: "none",
                color: isActive ? "#ffeb3b" : "white",
                marginBottom: "8px",
              })}
            >
              <ListItemButton
                sx={{
                  justifyContent: "center",
                  borderRadius: 2,
                  width: 48,
                  height: 48,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 0 }}>
                  {item.icon}
                </ListItemIcon>
              </ListItemButton>
            </NavLink>
          </Tooltip>
        ))}
      </List>
    </Box>
  );
};

export default Aside;




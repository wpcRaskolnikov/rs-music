import React, { useEffect, useState } from "react";
import {
  Box,
  List,
  IconButton,
  Divider,
  ListSubheader,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuList,
  MenuItem,
} from "@mui/material";
import { SongTable, AddPlaylistDialog } from "../components";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import Database from "@tauri-apps/plugin-sql";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export interface PlaylistMenu {
  label: string;
  playlistId: string;
}

const SongList: React.FC = () => {
  const [playlistMenus, setPlaylistMenus] = useState<PlaylistMenu[]>([]);
  const [playlistId, setPlaylistId] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [currentMenu, setCurrentMenu] = useState<PlaylistMenu>({
    label: "全部音乐",
    playlistId: "music",
  });

  const handleContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    menu: PlaylistMenu,
  ) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
    setCurrentMenu(menu);
  };

  const handlePickFile = async () => {
    const file = await open({
      multiple: true,
      directory: false,
      filters: [
        {
          name: "音乐文件",
          extensions: ["mp3", "flac", "wav", "m4a"],
        },
      ],
    });
    if (!file) {
      return;
    }
    invoke("add_music_files", {
      path: file,
      playlistId: currentMenu.playlistId,
    });
    setAnchorEl(null);
  };

  const handlePickFolder = async () => {
    const file = await open({ multiple: false, directory: true });
    if (!file) {
      return;
    }
    invoke("add_music_folder", {
      path: file,
      playlistId: currentMenu.playlistId,
    });
    setAnchorEl(null);
  };

  const handleRemovePlaylist = async () => {
    const db = await Database.load("sqlite:db.sqlite");
    db.execute("DELETE FROM playlist WHERE playlist_id = ?", [
      currentMenu.playlistId,
    ]);
    db.execute("DELETE FROM music WHERE playlist_id = ?", [
      currentMenu.playlistId,
    ]);
    setPlaylistMenus((prev) =>
      prev.filter((p) => p.playlistId !== currentMenu.playlistId),
    );
    if (playlistId === currentMenu.playlistId) {
      setPlaylistId(playlistMenus[0].playlistId);
    }
    setAnchorEl(null);
  };

  useEffect(() => {
    (async () => {
      const db = await Database.load("sqlite:db.sqlite");
      const rows = await db.select<typeof playlistMenus>(
        `SELECT label, playlist_id AS playlistId FROM playlist`,
      );
      if (rows) {
        setPlaylistMenus(rows);
        setPlaylistId(rows[0].playlistId);
      }
    })();
  }, []);

  return (
    <Box display="flex" height="100%">
      <List
        dense
        sx={{
          width: "150px",
          bgcolor: "background.paper",
          position: "relative",
          overflow: "auto",
          p: 0,
          pt: 2,
          borderRight: "1px solid #e0e0e0",
        }}
      >
        <ListSubheader
          sx={{
            px: 2,
            py: "6px",
            lineHeight: "normal",
            position: "static",
            bgcolor: "background.paper",
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            播放列表
            <IconButton size="small" onClick={() => setOpenDialog(true)}>
              <PlaylistAddIcon fontSize="small" />
            </IconButton>
          </Box>
        </ListSubheader>
        <Divider />

        {playlistMenus.map((menu) => (
          <ListItem key={menu.playlistId} disablePadding>
            <ListItemButton
              selected={playlistId === menu.playlistId}
              sx={{ px: 2 }}
              onClick={() => setPlaylistId(menu.playlistId)}
              onContextMenu={(e) => handleContextMenu(e, menu)}
            >
              <ListItemText primary={menu.label} />
            </ListItemButton>
          </ListItem>
        ))}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuList dense sx={{ p: 0 }}>
            <MenuItem onClick={handlePickFile}>导入文件</MenuItem>
            <MenuItem onClick={handlePickFolder}>导入文件夹</MenuItem>
            <MenuItem onClick={handleRemovePlaylist}>移除列表</MenuItem>
          </MenuList>
        </Menu>
      </List>

      <SongTable playlistId={playlistId} />

      <AddPlaylistDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onAddPlaylist={(playlist) =>
          setPlaylistMenus((prev) => [...prev, playlist])
        }
      />
    </Box>
  );
};

export default React.memo(SongList);

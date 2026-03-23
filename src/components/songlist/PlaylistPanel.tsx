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
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useAtom, useAtomValue } from "jotai";
import { v4 as uuidv4 } from "uuid";
import {
  MusicMetadata,
  PlaylistMenu,
  getDb,
  currentTrackAtom,
  currentPlaylistAtom,
  playlistMenusAtom,
} from "../../store";
import NewDialog from "./NewDialog";
import RenameDialog from "./RenameDialog";
import { useLatest } from "../../utils";

interface PlaylistPanelProps {
  onSelect: (id: string) => void;
  onSelectedImported: () => void;
}

const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
  onSelect,
  onSelectedImported,
}) => {
  const currentTrack = useAtomValue(currentTrackAtom);
  const [currentPlaylist, setCurrentPlaylist] = useAtom(currentPlaylistAtom);
  const [menus, setMenus] = useAtom(playlistMenusAtom);
  const [selectedId, setSelectedId] = useState(currentTrack.playlistId);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextTarget, setContextTarget] = useState<PlaylistMenu | null>(null);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openRenameDialog, setOpenRenameDialog] = useState(false);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect(id);
  };

  useEffect(() => {
    if (menus.length > 0) return;
    (async () => {
      const db = await getDb();
      const rows = await db.select<PlaylistMenu[]>(
        "SELECT label, playlist_id AS playlistId FROM playlist",
      );
      if (rows?.length) {
        setMenus(rows);
        if (!selectedId) {
          handleSelect(rows[0].playlistId);
        }
      }
    })();
  }, []);

  const locateHandler = useLatest(() => {
    if (menus.length) handleSelect(currentTrack.playlistId);
  });

  useEffect(() => {
    const handler = () => locateHandler.current();
    window.addEventListener("locate-playlist", handler);
    return () => window.removeEventListener("locate-playlist", handler);
  }, []);

  const handleContextMenu = (
    e: React.MouseEvent<HTMLElement>,
    menu: PlaylistMenu,
  ) => {
    e.preventDefault();
    setAnchorEl(e.currentTarget);
    setContextTarget(menu);
  };

  const reloadPlaylist = async (id: string) => {
    const db = await getDb();
    const rows = await db.select<MusicMetadata[]>(
      "SELECT * FROM music WHERE playlist_id = ? ORDER BY sort_order",
      [id],
    );
    setCurrentPlaylist({ id, songs: rows });
  };

  const handleImportFiles = async (menu: PlaylistMenu) => {
    const file = await open({
      multiple: true,
      directory: false,
      filters: [{ name: "音乐文件", extensions: ["mp3", "flac", "wav"] }],
    });
    if (!file) return;
    await invoke("add_music_files", {
      path: file,
      playlistId: menu.playlistId,
    });
    if (menu.playlistId === currentPlaylist.id) {
      reloadPlaylist(menu.playlistId);
    } else if (menu.playlistId === selectedId) {
      onSelectedImported();
    }
  };

  const handleImportFolder = async (menu: PlaylistMenu) => {
    const file = await open({ multiple: false, directory: true });
    if (!file) return;
    await invoke("add_music_folder", {
      path: file,
      playlistId: menu.playlistId,
    });
    if (menu.playlistId === currentPlaylist.id) {
      reloadPlaylist(menu.playlistId);
    } else if (menu.playlistId === selectedId) {
      onSelectedImported();
    }
  };

  const handleCreate = async (label: string) => {
    const newPlaylistId = "playlist_" + uuidv4();
    const db = await getDb();
    await db.execute(
      "INSERT INTO playlist (label, playlist_id) VALUES (?, ?)",
      [label, newPlaylistId],
    );
    setMenus((prev) => [...prev, { label, playlistId: newPlaylistId }]);
  };

  const handleRename = async (label: string, menu: PlaylistMenu) => {
    const db = await getDb();
    await db.execute("UPDATE playlist SET label = ? WHERE playlist_id = ?", [
      label,
      menu.playlistId,
    ]);
    setMenus((prev) =>
      prev.map((p) => (p.playlistId === menu.playlistId ? { ...p, label } : p)),
    );
  };

  const handleRemove = async (menu: PlaylistMenu) => {
    const db = await getDb();
    db.execute("DELETE FROM playlist WHERE playlist_id = ?", [menu.playlistId]);
    db.execute("DELETE FROM music WHERE playlist_id = ?", [menu.playlistId]);
    const newMenus = menus.filter((p) => p.playlistId !== menu.playlistId);
    setMenus(newMenus);
    if (menu.playlistId === currentTrack.playlistId) {
      setCurrentPlaylist({ id: "", songs: [] });
    }
    if (selectedId === menu.playlistId && newMenus.length > 0) {
      handleSelect(newMenus[0].playlistId);
    }
  };

  return (
    <>
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
            <IconButton size="small" onClick={() => setOpenNewDialog(true)}>
              <PlaylistAddIcon fontSize="small" />
            </IconButton>
          </Box>
        </ListSubheader>
        <Divider />

        {menus.map((menu) => (
          <ListItem key={menu.playlistId} disablePadding>
            <ListItemButton
              selected={selectedId === menu.playlistId}
              sx={{ px: 2 }}
              onClick={() => handleSelect(menu.playlistId)}
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
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                handleImportFiles(contextTarget!);
              }}
            >
              导入文件
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                handleImportFolder(contextTarget!);
              }}
            >
              导入文件夹
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setOpenRenameDialog(true);
              }}
            >
              重命名
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                handleRemove(contextTarget!);
              }}
            >
              移除列表
            </MenuItem>
          </MenuList>
        </Menu>
      </List>

      <NewDialog
        open={openNewDialog}
        onClose={() => setOpenNewDialog(false)}
        onSubmit={handleCreate}
      />

      <RenameDialog
        open={openRenameDialog}
        currentName={contextTarget?.label ?? ""}
        onClose={() => setOpenRenameDialog(false)}
        onSubmit={(label) => handleRename(label, contextTarget!)}
      />
    </>
  );
};

export default PlaylistPanel;

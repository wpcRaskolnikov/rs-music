import React, { useEffect, useState } from "react";
import { useLocation } from "react-router";
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
import { SongTable, NewDialog, RenameDialog } from "../components";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import Database from "@tauri-apps/plugin-sql";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { useAtom, useSetAtom } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { MusicMetadata, isPlayingAtom, currentTrackAtom } from "../store";

export interface PlaylistMenu {
  label: string;
  playlistId: string;
}

const SongList: React.FC = () => {
  const location = useLocation();
  const [playlistMenus, setPlaylistMenus] = useState<PlaylistMenu[]>([]);
  const [playlistId, setPlaylistId] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openRenameDialog, setOpenRenameDialog] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [currentMenu, setCurrentMenu] = useState<PlaylistMenu>({
    label: "全部音乐",
    playlistId: "music",
  });
  const [songList, setSongList] = useState<MusicMetadata[]>([]);
  const setIsPlaying = useSetAtom(isPlayingAtom);
  const [currentTrack, setCurrentTrack] = useAtom(currentTrackAtom);

  const loadSongs = async (id: string) => {
    const db = await Database.load("sqlite:db.sqlite");
    const rows = await db.select<MusicMetadata[]>(
      "SELECT * FROM music WHERE playlist_id = ? ORDER BY sort_order",
      [id],
    );
    setSongList(rows);
  };

  const handleReorder = async (
    newList: MusicMetadata[],
    from: number,
    to: number,
  ) => {
    setSongList(newList);
    // 只有查看的列表就是播放的列表，才需要更新 currentIndex
    if (playlistId === currentTrack.playlistId && currentTrack.index >= 0) {
      const playingSrc = songList[currentTrack.index].src;
      const newCi = newList.findIndex((s) => s.src === playingSrc);
      if (newCi !== currentTrack.index) {
        setCurrentTrack({ ...currentTrack, index: newCi });
        const store = await load("last_played.json");
        await store.set("index", newCi);
      }
    }
    await invoke("move_music", { playlistId, from, to });
  };

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
      filters: [{ name: "音乐文件", extensions: ["mp3", "flac", "wav"] }],
    });
    if (!file) return;
    await invoke("add_music_files", {
      path: file,
      playlistId: currentMenu.playlistId,
    });
    loadSongs(playlistId);
    setAnchorEl(null);
  };

  const handlePickFolder = async () => {
    const file = await open({ multiple: false, directory: true });
    if (!file) return;
    await invoke("add_music_folder", {
      path: file,
      playlistId: currentMenu.playlistId,
    });
    loadSongs(playlistId);
    setAnchorEl(null);
  };

  const handlePlay = (index: number) => {
    setIsPlaying(true);
    invoke("play_music", { playlistId, index });
  };

  const handleRemoveSong = async (src: string) => {
    const db = await Database.load("sqlite:db.sqlite");
    await db.execute("DELETE FROM music WHERE playlist_id = ? AND src = ?", [
      playlistId,
      src,
    ]);
    setSongList((prev) => prev.filter((s) => s.src !== src));
  };

  const handleCreatePlaylist = async (label: string) => {
    const newPlaylistId = "playlist_" + uuidv4();
    const db = await Database.load("sqlite:db.sqlite");
    await db.execute(
      "INSERT INTO playlist (label, playlist_id) VALUES (?, ?)",
      [label, newPlaylistId],
    );
    setPlaylistMenus((prev) => [...prev, { label, playlistId: newPlaylistId }]);
  };

  const handleRenamePlaylist = async (label: string) => {
    const db = await Database.load("sqlite:db.sqlite");
    await db.execute("UPDATE playlist SET label = ? WHERE playlist_id = ?", [
      label,
      currentMenu.playlistId,
    ]);
    setPlaylistMenus((prev) =>
      prev.map((p) =>
        p.playlistId === currentMenu.playlistId ? { ...p, label } : p,
      ),
    );
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
      if (rows?.length) {
        setPlaylistMenus(rows);
        const isLocate = location.state?.locate;
        setPlaylistId(isLocate ? currentTrack.playlistId : rows[0].playlistId);
      }
    })();
  }, []);

  useEffect(() => {
    if (!playlistId) return;
    loadSongs(playlistId);
  }, [playlistId]);

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
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setOpenRenameDialog(true);
              }}
            >
              重命名
            </MenuItem>
            <MenuItem onClick={handleRemovePlaylist}>移除列表</MenuItem>
          </MenuList>
        </Menu>
      </List>

      <SongTable
        list={songList}
        currentIndex={
          playlistId === currentTrack.playlistId ? currentTrack.index : -1
        }
        onPlay={handlePlay}
        onRemove={handleRemoveSong}
        onReorder={handleReorder}
      />

      <NewDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onCreate={handleCreatePlaylist}
      />

      <RenameDialog
        open={openRenameDialog}
        currentLabel={currentMenu.label}
        onClose={() => setOpenRenameDialog(false)}
        onRename={handleRenamePlaylist}
      />
    </Box>
  );
};

export default React.memo(SongList);

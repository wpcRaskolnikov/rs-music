import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import Database from "@tauri-apps/plugin-sql";

interface AddPlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  onAddPlaylist: (playlist: { label: string; playlistId: string }) => void;
}

const AddPlaylistDialog: React.FC<AddPlaylistDialogProps> = ({
  open,
  onClose,
  onAddPlaylist
}) => {
  const [newLabel, setNewLabel] = useState("");

  const addPlaylist = async () => {
    if (!newLabel.trim()) return;

    const tableName = "playlist_" + uuidv4();
    const newPlaylist = { label: newLabel.trim(), playlistId: tableName };

    const db = await Database.load("sqlite:db.sqlite");
    db.execute(
      "INSERT INTO playlist (label, playlist_id) VALUES (?, ?)",
      [newPlaylist.label, newPlaylist.playlistId]
    );

    onAddPlaylist(newPlaylist);
    setNewLabel("");
    onClose();
  };

  return (
    <Dialog  open={open} onClose={onClose}>
      <DialogTitle>新建播放列表</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="播放列表名称"
          fullWidth
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={addPlaylist} variant="outlined">
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPlaylistDialog;

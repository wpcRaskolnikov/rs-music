import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

interface NewPlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (label: string) => void;
}

const NewPlaylistDialog: React.FC<NewPlaylistDialogProps> = ({
  open,
  onClose,
  onCreate,
}) => {
  const [label, setLabel] = useState("");

  const handleConfirm = () => {
    if (!label.trim()) return;
    onCreate(label.trim());
    setLabel("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>新建播放列表</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="播放列表名称"
          fullWidth
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleConfirm}>确定</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewPlaylistDialog;

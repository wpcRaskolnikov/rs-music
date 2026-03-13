import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

interface NewDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (label: string) => void;
}

const NewDialog: React.FC<NewDialogProps> = ({ open, onClose, onCreate }) => {
  const [label, setLabel] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onCreate(label.trim());
    setLabel("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
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
          <Button type="button" onClick={onClose}>
            取消
          </Button>
          <Button type="submit">确定</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default NewDialog;

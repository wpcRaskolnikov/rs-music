import React, { useState } from "react";
import type { SubmitEventHandler } from "react";
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
  onSubmit: (label: string) => void;
}

const NewDialog: React.FC<NewDialogProps> = ({ open, onClose, onSubmit }) => {
  const [name, setName] = useState("");

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
    setName("");
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
            value={name}
            onChange={(e) => setName(e.target.value)}
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

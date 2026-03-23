import React, { useState, useEffect } from "react";
import type { SubmitEventHandler } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

interface RenameDialogProps {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onSubmit: (label: string) => void;
}

const RenameDialog: React.FC<RenameDialogProps> = ({
  open,
  currentName,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>重命名播放列表</DialogTitle>
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

export default RenameDialog;

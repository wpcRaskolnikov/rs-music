import React, { useState, useEffect } from "react";
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
  currentLabel: string;
  onClose: () => void;
  onRename: (label: string) => void;
}

const RenameDialog: React.FC<RenameDialogProps> = ({
  open,
  currentLabel,
  onClose,
  onRename,
}) => {
  const [label, setLabel] = useState(currentLabel);

  useEffect(() => {
    if (open) setLabel(currentLabel);
  }, [open, currentLabel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onRename(label.trim());
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

export default RenameDialog;

import { CardMedia, Dialog, Box, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

const AlbumCover: React.FC<{ path: string }> = ({ path }) => {
  const [cover, setCover] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    invoke<string>("get_album_cover", { path })
      .then(setCover)
      .catch((error) => console.error("获取封面失败:", error));
  }, [path]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  if (!cover) return <div>加载中...</div>;

  const coverImageUrl = `data:image/png;base64, ${cover}`;

  return (
    <>
      <CardMedia
        component="img"
        image={coverImageUrl}
        alt="Album Cover"
        onClick={handleOpen}
        sx={{
          height: "100%",
          width: "auto",
          cursor: "pointer",
          transition: "all 0.3s ease",
          borderRadius: 1,
          "&:hover": {
            transform: "scale(1.05)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          },
        }}
      />

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 2,
          }}
        >
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "rgba(0, 0, 0, 0.6)",
              color: "white",
              zIndex: 1,
              "&:hover": {
                bgcolor: "rgba(0, 0, 0, 0.8)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box
            component="img"
            src={coverImageUrl}
            alt="Album Cover"
            sx={{
              maxWidth: "100%",
              maxHeight: "80vh",
              borderRadius: 2,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          />
        </Box>
      </Dialog>
    </>
  );
};

export default AlbumCover;

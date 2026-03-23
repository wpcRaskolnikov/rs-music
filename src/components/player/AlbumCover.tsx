import { invoke } from "@tauri-apps/api/core";
import { Box, CardMedia, Dialog, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useAtomValue } from "jotai";
import { useState, useEffect } from "react";
import { currentTrackInfoAtom } from "../../store";

const AlbumCover: React.FC = () => {
  const { src } = useAtomValue(currentTrackInfoAtom);
  const [cover, setCover] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!src) {
      setCover(null);
      return;
    }
    invoke<string>("get_album_cover", { path: src })
      .then((b64) => setCover(`data:image/png;base64,${b64}`))
      .catch(() => setCover(null));
  }, [src]);

  if (!cover) return <div>加载中...</div>;

  return (
    <>
      <CardMedia
        component="img"
        image={cover}
        alt="Album Cover"
        onClick={() => setOpen(true)}
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
        onClose={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "rgba(0, 0, 0, 0.6)",
              color: "white",
              zIndex: 1,
              "&:hover": { bgcolor: "rgba(0, 0, 0, 0.8)" },
            }}
          >
            <CloseIcon />
          </IconButton>
          <CardMedia
            component="img"
            image={cover}
            alt="Album Cover"
            sx={{
              maxHeight: "80vh",
              width: "auto",
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

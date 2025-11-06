import { CardMedia } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

const AlbumCover: React.FC<{ path: string }> = ({ path }) => {
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await invoke<string>("get_album_cover", {
          path: path,
        });
        setCover(result);
      } catch (error) {
        console.error("获取封面失败:", error);
      }
    })();
  }, [path]);

  if (!cover) return <div>加载中...</div>;

  return (
    <CardMedia
      component="img"
      image={`data:image/png;base64, ${cover}`}
      alt="Album Cover"
      sx={{
        height: "100%",
        width: "auto",
      }}
    />
  );
};

export default AlbumCover;

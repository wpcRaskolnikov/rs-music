import React, { useEffect, useState } from "react";
import { Box, Button, Typography, Divider } from "@mui/material";
import { getVersion } from "@tauri-apps/api/app";
import { ShortcutSection, UserApiPanel } from "../components";

const Setting: React.FC = () => {
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  return (
    <Box sx={{ padding: 2, overflowY: "auto", height: "100%" }}>
      <ShortcutSection />
      <Divider sx={{ mt: 2, mb: 2 }} />

      <UserApiPanel />
      <Divider sx={{ mt: 2, mb: 2 }} />

      {/* 备份与恢复 */}
      <Typography variant="h6" gutterBottom>
        备份与恢复
      </Typography>
      <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Button variant="outlined" size="small">
          导入设置
        </Button>
        <Button variant="outlined" size="small">
          导出设置
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        rs-music v{version}
      </Typography>
    </Box>
  );
};

export default Setting;

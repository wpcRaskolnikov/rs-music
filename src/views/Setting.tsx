import React from "react";
import { Box, Button, Typography } from "@mui/material";

const Setting: React.FC = () => {
  return (
    <Box sx={{ padding: 2, overflowY: "auto", height: "100%" }}>
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
    </Box>
  );
};

export default Setting;

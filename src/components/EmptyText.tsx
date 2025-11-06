import React from "react";
import { Box, Typography } from "@mui/material";

interface EmptyTextProps {
  text?: string;
}

const EmptyText: React.FC<EmptyTextProps> = ({ text = "暂无内容" }) => {
  return (
    <Box
      display="flex"
      height="100%"
      alignItems="center"
      justifyContent="center"
    >
      <Typography align="center" color="textSecondary">
        {text}
      </Typography>
    </Box>
  );
};

export default EmptyText;

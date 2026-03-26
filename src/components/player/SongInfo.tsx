import React from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import { useAtomValue } from "jotai";
import { currentTrackInfoAtom } from "../../store";

const textProps = {
  variant: "caption" as const,
  maxWidth: { xs: 60, sm: 80, md: 120, lg: 200 },
  noWrap: true,
  overflow: "hidden",
  textOverflow: "ellipsis",
  sx: { cursor: "default" },
};

const SongInfo: React.FC = () => {
  const { title, artist } = useAtomValue(currentTrackInfoAtom);
  return (
    <Box display="flex" flexDirection="column" alignItems="center" mx={1}>
      <Tooltip title={title} arrow placement="top" enterDelay={500}>
        <Typography {...textProps}>{title}</Typography>
      </Tooltip>
      <Tooltip title={artist} arrow placement="bottom" enterDelay={500}>
        <Typography {...textProps}>{artist}</Typography>
      </Tooltip>
    </Box>
  );
};

export default SongInfo;

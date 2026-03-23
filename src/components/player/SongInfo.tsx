import React from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import { useAtomValue } from "jotai";
import { currentTrackInfoAtom } from "../../store";

const SongInfo: React.FC = () => {
  const { title, artist } = useAtomValue(currentTrackInfoAtom);
  return (
    <Box display="flex" flexDirection="column" alignItems="center" mx={1}>
      <Tooltip title={title} arrow placement="top" enterDelay={500}>
        <Typography
          variant="caption"
          maxWidth={{
            xs: 50,
            sm: 75,
            md: 100,
            lg: 150,
          }}
          noWrap
          overflow="hidden"
          textOverflow="ellipsis"
          sx={{ cursor: "default" }}
        >
          {title}
        </Typography>
      </Tooltip>
      <Tooltip title={artist} arrow placement="bottom" enterDelay={500}>
        <Typography
          variant="caption"
          maxWidth={{
            xs: 50,
            sm: 75,
            md: 100,
            lg: 150,
          }}
          noWrap
          overflow="hidden"
          textOverflow="ellipsis"
          sx={{ cursor: "default" }}
        >
          {artist}
        </Typography>
      </Tooltip>
    </Box>
  );
};

export default SongInfo;

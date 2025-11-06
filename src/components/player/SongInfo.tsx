import React from "react";
import { Box, Typography } from "@mui/material";

const SongInfo: React.FC<{
  title: string;
  artist: string;
}> = ({ title, artist }) => {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" mx={1}>
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
      >
        {title}
      </Typography>
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
      >
        {artist}
      </Typography>
    </Box>
  );
};

export default SongInfo;

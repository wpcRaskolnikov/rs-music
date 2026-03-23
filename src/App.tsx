import React from "react";
import { Box, CssBaseline } from "@mui/material";
import Aside from "./layout/Aside";
import Player from "./layout/Player";
import Search from "./layout/Search";
import MainContent from "./layout/MainContent";

const App: React.FC = () => {
  return (
    <>
      <CssBaseline />
      <Box display="flex" height="100vh" width="100vw" bgcolor="#f5f5f5">
        <Aside />

        {/* 主体区域 */}
        <Box flex={1} display="flex" flexDirection="column" position="relative">
          <Search />
          <MainContent />
          <Player />
        </Box>
      </Box>
    </>
  );
};

export default App;

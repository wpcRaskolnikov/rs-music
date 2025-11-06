import React from "react";
import { Box, CssBaseline } from "@mui/material";
import Aside from "./layout/Aside";
import Player from "./layout/Player";
import Search from "./components/Search"; // 导入新组件
import {  DownloadList, SongList, Setting, SearchList } from "./views";
import { Routes, Route } from "react-router";
import Ranking from "./views/Ranking";
const App: React.FC = () => {
  return (
    <>
      <CssBaseline />
      <Box display="flex" height="100vh" width="100vw" bgcolor="#f5f5f5">
        <Aside />

        {/* 主体区域 */}
        <Box flex={1} display="flex" flexDirection="column" position="relative">
          <Search />

          {/* 内容显示区 */}
          <Box flex={1} p={2} overflow="auto" bgcolor="white">
            <Routes>
              <Route index element={<SearchList />} />
              <Route path="/search" element={<SearchList />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/download" element={<DownloadList />} />
              <Route path="/songlist" element={<SongList />} />
              <Route path="/setting" element={<Setting />} />
            </Routes>
          </Box>
          <Player />
        </Box>
      </Box>
    </>
  );
};

export default App;

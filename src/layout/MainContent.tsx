import React from "react";
import { Box } from "@mui/material";
import { Routes, Route, Navigate } from "react-router";
import { DownloadList, Ranking, SongList, Setting, SearchList } from "../views";

const MainContent: React.FC = () => {
  return (
    <Box flex={1} overflow="auto" bgcolor="white">
      <Routes>
        <Route index element={<Navigate to="/search" replace />} />
        <Route path="/search" element={<SearchList />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/download" element={<DownloadList />} />
        <Route path="/songlist" element={<SongList />} />
        <Route path="/setting" element={<Setting />} />
      </Routes>
    </Box>
  );
};

export default MainContent;

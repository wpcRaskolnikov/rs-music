import React, { useEffect } from "react";
import { Box, CssBaseline } from "@mui/material";
import { useAtomValue, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import Aside from "./layout/Aside";
import Player from "./layout/Player";
import Search from "./layout/Search";
import MainContent from "./layout/MainContent";
import { selectedApiAtom, qualitiesAtom } from "./store";

const App: React.FC = () => {
  const selectedApi = useAtomValue(selectedApiAtom);
  const setQualities = useSetAtom(qualitiesAtom);

  useEffect(() => {
    const setupScript = async () => {
      if (selectedApi?.scriptContent) {
        await invoke("init_script", { script: selectedApi.scriptContent });
        await invoke<Record<string, string[]>>("get_qualities").then(
          setQualities,
        );
      }
    };
    setupScript();
  }, [selectedApi]);

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

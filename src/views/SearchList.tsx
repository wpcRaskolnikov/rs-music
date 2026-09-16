import React, { useState } from "react";
import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";

import { LocalTable, OnlineTable } from "../components";
import { sourceNameMap } from "../utils/musicSearch/types";
import type { Source } from "../utils/musicSearch/types";

const onlineSources: Source[] = ["kw", "kg", "tx", "wy", "mg"];
const tabLabels = ["本地", ...onlineSources.map((s) => sourceNameMap[s])];

const SearchList: React.FC = () => {
  const [tabValue, setTabValue] = useState("0");

  return (
    <TabContext value={tabValue}>
      <Box
        sx={{
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TabList
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          {tabLabels.map((label, i) => (
            <Tab key={label} label={label} value={String(i)} />
          ))}
        </TabList>

        <TabPanel value="0" sx={{ padding: 0, overflow: "auto" }}>
          <LocalTable />
        </TabPanel>
        {onlineSources.map((source, i) => (
          <TabPanel
            key={source}
            value={String(i + 1)}
            sx={{ padding: 0, overflow: "auto" }}
          >
            <OnlineTable source={source} />
          </TabPanel>
        ))}
      </Box>
    </TabContext>
  );
};

export default SearchList;

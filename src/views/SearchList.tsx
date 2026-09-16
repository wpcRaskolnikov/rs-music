import React, { useDeferredValue, useEffect, useState } from "react";
import { Box, Tabs, Tab, TableContainer } from "@mui/material";
import { EmptyText, LocalTable, OnlineTable } from "../components";
import { useAtomValue } from "jotai";
import { db, searchQueryAtom, MusicMetadata } from "../store";
import { sourceNameMap } from "../utils/musicSearch/types";
import type { Source } from "../utils/musicSearch/types";

interface SearchResult extends MusicMetadata {
  playlist_id: string;
  playlist_label: string;
}

const onlineSources: Source[] = ["kw", "kg", "tx", "wy", "mg"];

const tabs = ["本地", ...onlineSources.map((s) => sourceNameMap[s])];

const SearchList: React.FC = () => {
  const query = useAtomValue(searchQueryAtom);
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;
  const [results, setResults] = useState<SearchResult[]>([]);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (tabValue !== 0 || !deferredQuery.trim()) {
      setResults([]);
      return;
    }
    const keyword = `%${deferredQuery.trim()}%`;
    (async () => {
      const rows = await db.select<SearchResult[]>(
        `SELECT m.src, m.title, m.artist, m.album, m.duration, m.playlist_id,
                COALESCE(p.label, m.playlist_id) AS playlist_label
         FROM music m
         LEFT JOIN playlist p ON m.playlist_id = p.playlist_id
         WHERE m.title LIKE ? OR m.artist LIKE ? OR m.album LIKE ?
         ORDER BY m.title`,
        [keyword, keyword, keyword],
      );
      setResults(rows);
    })();
  }, [deferredQuery, tabValue]);

  const source = onlineSources[tabValue - 1];

  const header = (
    <Tabs
      value={tabValue}
      onChange={(_, v) => setTabValue(v)}
      sx={{ px: 2, pt: 1 }}
      variant="scrollable"
      scrollButtons="auto"
    >
      {tabs.map((label) => (
        <Tab key={label} label={label} />
      ))}
    </Tabs>
  );

  // Local tab (tabValue === 0)
  if (tabValue === 0) {
    if (!query.trim()) {
      return (
        <Box
          sx={{
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {header}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyText text="输入关键词搜索本地歌曲" />
          </Box>
        </Box>
      );
    }

    if (!results.length && !isStale) {
      return (
        <Box
          sx={{
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {header}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyText text="无搜索结果" />
          </Box>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {header}
        <TableContainer sx={{ flex: 1, minHeight: 0 }}>
          <LocalTable results={results} />
        </TableContainer>
      </Box>
    );
  }

  // Online tabs — OnlineTable manages its own layout
  return (
    <Box
      sx={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {header}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <OnlineTable source={source} />
      </Box>
    </Box>
  );
};

export default SearchList;

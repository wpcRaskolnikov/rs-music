import React, { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { arrayMove } from "@dnd-kit/helpers";
import EmptyText from "../EmptyText";
import { MusicMetadata } from "../../store";
import { formatTime } from "../../utils";

const GRID = "32px 1fr 160px 160px 88px 60px";

interface SortableRowProps {
  item: MusicMetadata;
  index: number;
  isActive: boolean;
  onPlay: () => void;
  onRemove: () => void;
  measureElement: (el: Element | null) => void;
}

function SortableRow({
  item,
  index,
  isActive,
  onPlay,
  onRemove,
  measureElement,
}: SortableRowProps) {
  const [element, setElement] = useState<Element | null>(null);
  const handleRef = useRef<HTMLElement | null>(null);
  const { isDragging } = useSortable({
    id: item.src,
    index,
    element,
    handle: handleRef,
    feedback: "clone",
  });

  return (
    <ListItem
      ref={(el: HTMLLIElement | null) => {
        setElement(el);
        measureElement(el);
      }}
      data-index={index}
      data-active={isActive || undefined}
      disablePadding
      sx={{
        opacity: isDragging ? 0.3 : 1,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <ListItemButton
        dense
        selected={isActive}
        onDoubleClick={onPlay}
        sx={{
          display: "grid",
          gridTemplateColumns: GRID,
          alignItems: "flex-start",
          gap: 1,
          py: 0.75,
        }}
      >
        <Box
          ref={handleRef}
          sx={{
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            alignSelf: "center",
          }}
        >
          {isActive ? (
            <GraphicEqIcon fontSize="small" color="primary" />
          ) : (
            <DragIndicatorIcon fontSize="small" color="disabled" />
          )}
        </Box>

        <ListItemText
          primary={item.title}
          sx={{ m: 0, minWidth: 0 }}
          slotProps={{
            primary: {
              sx: {
                fontSize: "0.875rem",
                color: isActive ? "primary.main" : "text.primary",
                fontWeight: isActive ? 600 : "normal",
                wordBreak: "break-word",
              },
            },
          }}
        />

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ wordBreak: "break-word" }}
        >
          {item.artist}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ wordBreak: "break-word" }}
        >
          {item.album}
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <IconButton size="small" onClick={onPlay}>
            <HeadphonesIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onRemove}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "right", whiteSpace: "nowrap", pt: 0.25 }}
        >
          {formatTime(item.duration)}
        </Typography>
      </ListItemButton>
    </ListItem>
  );
}

const SongTable: React.FC<{
  list: MusicMetadata[];
  currentIndex: number;
  onPlay: (index: number) => void;
  onRemove: (src: string) => void;
  onReorder: (newList: MusicMetadata[], from: number, to: number) => void;
}> = ({ list, currentIndex, onPlay, onRemove, onReorder }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 拖拽期间用 localList 驱动渲染，拖完提交给外部
  const [localList, setLocalList] = useState(list);
  const snapshot = useRef(list);
  const localListRef = useRef(localList);
  localListRef.current = localList;

  useEffect(() => {
    setLocalList(list);
  }, [list]);

  const virtualizer = useVirtualizer({
    count: localList.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5,
    getItemKey: (index) => localList[index].src,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < localList.length) {
      virtualizer.scrollToIndex(currentIndex, { align: "center" });
    }
  }, [currentIndex, localList.length]);

  useEffect(() => {
    const handler = () => {
      if (currentIndex >= 0 && currentIndex < localList.length) {
        virtualizer.scrollToIndex(currentIndex, { align: "center" });
      }
    };
    window.addEventListener("locate-playlist", handler);
    return () => window.removeEventListener("locate-playlist", handler);
  }, [currentIndex, localList.length]);

  return (
    <Box sx={{ flex: 1, height: "100%", overflow: "hidden", p: 2 }}>
      {localList.length ? (
        <Box ref={scrollRef} sx={{ height: "100%", overflowY: "auto" }}>
          {/* Sticky 表头 */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 1,
              bgcolor: "background.paper",
              display: "grid",
              gridTemplateColumns: GRID,
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1,
              borderBottom: "2px solid",
              borderColor: "divider",
            }}
          >
            <Box />
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
            >
              歌曲名
            </Typography>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
            >
              歌手
            </Typography>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
            >
              专辑
            </Typography>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              textAlign="center"
            >
              操作
            </Typography>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              textAlign="right"
              noWrap
            >
              时长
            </Typography>
          </Box>

          {/* 虚拟滚动列表 */}
          <DragDropProvider
            onDragStart={() => {
              snapshot.current = structuredClone(localList);
            }}
            onDragOver={(event) => {
              const { source, target } = event.operation;
              if (!source || !target || source.id === target.id) return;
              setLocalList((items) => {
                const from = items.findIndex(
                  (i) => i.src === String(source.id),
                );
                const to = items.findIndex((i) => i.src === String(target.id));
                if (from === -1 || to === -1 || from === to) return items;
                return arrayMove(items, from, to);
              });
            }}
            onDragEnd={(event) => {
              if (event.canceled || !event.operation.source) {
                setLocalList(snapshot.current);
                return;
              }
              const current = localListRef.current;
              const src = String(event.operation.source.id);
              const from = snapshot.current.findIndex(
                (item) => item.src === src,
              );
              const to = current.findIndex((item) => item.src === src);
              onReorder(current, from, to);
            }}
          >
            <Box
              sx={{ height: virtualizer.getTotalSize(), position: "relative" }}
            >
              <List
                dense
                disablePadding
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
                }}
              >
                {virtualItems.map((virtualRow) => (
                  <SortableRow
                    key={virtualRow.key}
                    item={localList[virtualRow.index]}
                    index={virtualRow.index}
                    isActive={
                      localList[virtualRow.index]?.src ===
                      list[currentIndex]?.src
                    }
                    onPlay={() => onPlay(virtualRow.index)}
                    onRemove={() => onRemove(localList[virtualRow.index].src)}
                    measureElement={virtualizer.measureElement}
                  />
                ))}
              </List>
            </Box>
          </DragDropProvider>
        </Box>
      ) : (
        <EmptyText text="暂无歌曲" />
      )}
    </Box>
  );
};

export default SongTable;

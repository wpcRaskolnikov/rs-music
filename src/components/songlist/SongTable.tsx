import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
} from "@mui/material";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import EmptyText from "../EmptyText";
import { MusicMetadata, scrollToCurrentAtom } from "../../store";
import { formatTime } from "../../utils";
import { useAtomValue } from "jotai";

interface SortableRowProps {
  item: MusicMetadata;
  index: number;
  isActive: boolean;
  onPlay: () => void;
  onRemove: () => void;
}

function SortableRow({
  item,
  index,
  isActive,
  onPlay,
  onRemove,
}: SortableRowProps) {
  const [element, setElement] = useState<Element | null>(null);
  const handleRef = useRef<HTMLElement | null>(null);
  const { isDragging } = useSortable({
    id: item.src,
    index,
    element,
    handle: handleRef,
  });

  const scrollToCurrent = useAtomValue(scrollToCurrentAtom);
  useEffect(() => {
    if (isActive) element?.scrollIntoView({ block: "nearest" });
  }, [scrollToCurrent]);

  return (
    <TableRow
      ref={(el) => setElement(el)}
      hover
      selected={isActive}
      onDoubleClick={onPlay}
      sx={{ opacity: isDragging ? 0.3 : 1 }}
    >
      <TableCell sx={{ width: 32, p: 0, pl: 1 }}>
        <Box
          ref={handleRef}
          sx={{ cursor: "grab", display: "flex", alignItems: "center" }}
        >
          {isActive ? (
            <GraphicEqIcon fontSize="small" color="primary" />
          ) : (
            <DragIndicatorIcon fontSize="small" color="disabled" />
          )}
        </Box>
      </TableCell>
      <TableCell
        sx={{
          color: isActive ? "primary.main" : "inherit",
          fontWeight: isActive ? 600 : "normal",
        }}
      >
        {item.title}
      </TableCell>
      <TableCell>{item.artist}</TableCell>
      <TableCell>{item.album}</TableCell>
      <TableCell align="center">
        <Box display="flex">
          <IconButton onClick={onPlay}>
            <HeadphonesIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={onRemove}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </TableCell>
      <TableCell>{formatTime(item.duration)}</TableCell>
    </TableRow>
  );
}

const SongTable: React.FC<{
  list: MusicMetadata[];
  currentIndex: number;
  onPlay: (index: number) => void;
  onRemove: (src: string) => void;
  onReorder: (newList: MusicMetadata[]) => void;
}> = ({ list, currentIndex, onPlay, onRemove, onReorder }) => {
  return (
    <Box sx={{ flex: 1, height: "100%", overflow: "hidden", p: 2 }}>
      {list.length ? (
        <TableContainer sx={{ height: "100%" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 32 }} />
                <TableCell>歌曲名</TableCell>
                <TableCell>歌手</TableCell>
                <TableCell>专辑</TableCell>
                <TableCell align="center">操作</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>时长</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <DragDropProvider
                onDragEnd={(event) => {
                  if (event.canceled) return;
                  onReorder(move(list as any, event) as any);
                }}
              >
                {list.map((item, index) => (
                  <SortableRow
                    key={item.src}
                    item={item}
                    index={index}
                    isActive={index === currentIndex}
                    onPlay={() => onPlay(index)}
                    onRemove={() => onRemove(item.src)}
                  />
                ))}
              </DragDropProvider>
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyText text="暂无歌曲" />
      )}
    </Box>
  );
};

export default SongTable;

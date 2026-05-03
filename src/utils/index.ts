import { useRef, useEffect } from "react";

const formatTime = (sec: number) => {
  if (isNaN(sec) || sec <= 0) return "00:00";
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

export function formatSingerName(singers: any[]): string {
  if (Array.isArray(singers)) {
    return singers
      .map((s) => s.name ?? "")
      .filter(Boolean)
      .join("、");
  }
  return "";
}

export { formatTime };

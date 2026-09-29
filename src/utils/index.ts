import { useRef, useEffect, useState } from "react";

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

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
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

export function combineLrc(lyric: string, translation: string): string {
  if (!lyric.trim() || !translation.trim()) return lyric;
  return `${lyric.trimEnd()}\n[by:translation]\n${translation.trim()}`;
}

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

"use client";
import { useCallback } from "react";
import { MAX_COMPARE, useLocalStore } from "./use-local-store";

const EMPTY: string[] = [];

export function useCompare() {
  const [ids, setIds] = useLocalStore<string[]>("em:compare", EMPTY);
  const toggle = useCallback(
    (id: string) =>
      setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_COMPARE ? prev : [...prev, id])),
    [setIds],
  );
  const clear = useCallback(() => setIds([]), [setIds]);
  return { ids, toggle, clear, setIds, full: ids.length >= MAX_COMPARE };
}

"use client";
import { useCallback } from "react";
import type { DocStatus } from "@/lib/documents";
import { useLocalStore } from "./use-local-store";

export interface TrackerState {
  targets: string[];
  /** status[programId][docKey] */
  status: Record<string, Record<string, DocStatus>>;
  notes: Record<string, string>;
}

const EMPTY: TrackerState = { targets: [], status: {}, notes: {} };

export function useTracker() {
  const [state, setState] = useLocalStore<TrackerState>("em:tracker:v1", EMPTY);
  const addTarget = useCallback(
    (id: string) => setState((s) => (s.targets.includes(id) ? s : { ...s, targets: [...s.targets, id] })),
    [setState],
  );
  const removeTarget = useCallback(
    (id: string) =>
      setState((s) => {
        const status = { ...s.status };
        delete status[id];
        return { ...s, targets: s.targets.filter((x) => x !== id), status };
      }),
    [setState],
  );
  const setDoc = useCallback(
    (id: string, key: string, v: DocStatus) =>
      setState((s) => ({ ...s, status: { ...s.status, [id]: { ...(s.status[id] ?? {}), [key]: v } } })),
    [setState],
  );
  const setNote = useCallback((id: string, v: string) => setState((s) => ({ ...s, notes: { ...s.notes, [id]: v } })), [setState]);
  return { state, addTarget, removeTarget, setDoc, setNote, reset: () => setState(EMPTY) };
}

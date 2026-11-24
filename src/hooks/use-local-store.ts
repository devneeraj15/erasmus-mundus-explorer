"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed store shared across components and tabs.
 * Reads are wrapped in try/catch so the app still works when storage is blocked.
 */
const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    const cached = cache.get(key);
    return cached ? (cached.value as T) : fallback;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  if (raw != null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => e.key && emit(e.key));
}

export function useLocalStore<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(cb);
      return () => listeners.get(key)!.delete(cb);
    },
    [key],
  );
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = read(key, fallback);
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      const raw = JSON.stringify(v);
      cache.set(key, { raw, value: v });
      try {
        window.localStorage.setItem(key, raw);
      } catch {
        /* storage blocked: keep in-memory value */
      }
      emit(key);
    },
    [key, fallback],
  );
  return [value, set];
}

export const MAX_COMPARE = 5;

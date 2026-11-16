import { useEffect, useState, useSyncExternalStore } from 'react';

/** Returns `value` after it has stopped changing for `delay` ms. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function getQueryParam(name: string): string {
  return new URLSearchParams(window.location.hash.split('?')[1] || '').get(name) || '';
}

// ---- Saved pandits (stored on this device only) ----
const SAVED_KEY = 'pujanow_saved_pandits';
const listeners = new Set<() => void>();
let savedCache: string[] | null = null;

function readSaved(): string[] {
  if (savedCache) return savedCache;
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    savedCache = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    savedCache = [];
  }
  return savedCache;
}

function writeSaved(ids: string[]) {
  savedCache = ids;
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSavedPandits() {
  const ids = useSyncExternalStore(subscribe, readSaved);
  const toggle = (id: string): boolean => {
    const current = readSaved();
    const isSaved = current.includes(id);
    writeSaved(isSaved ? current.filter((x) => x !== id) : [...current, id]);
    return !isSaved;
  };
  return { ids, isSaved: (id: string) => ids.includes(id), toggle };
}

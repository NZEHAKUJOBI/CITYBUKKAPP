import { useEffect, useState } from 'react';

const PREFIX = 'citybukka:';

/** Read a JSON value saved on this device; falls back when storage is empty, blocked or corrupt. */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Private mode / quota exceeded – the app keeps working in memory.
  }
}

/** useState that survives reloads and app restarts. */
export function usePersistentState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() =>
    load(key, typeof initial === 'function' ? (initial as () => T)() : initial));
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue] as const;
}

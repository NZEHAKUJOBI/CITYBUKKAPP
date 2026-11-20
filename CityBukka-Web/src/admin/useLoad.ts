import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './adminApi';

/** Load data on mount / when `deps` change. Stale responses are ignored. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[], format: (err: unknown) => string = errorMessage) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const formatRef = useRef(format);
  formatRef.current = format;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await run();
      if (mine === seq.current) setData(result);
    } catch (err) {
      if (mine === seq.current) setError(formatRef.current(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => { void reload(); }, [reload]);

  return { data, setData, error, loading, reload };
}

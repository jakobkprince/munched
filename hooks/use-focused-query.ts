import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Loads data each time the screen comes into focus. Only the very first load
 * shows a spinner; later loads refresh quietly, so lists keep their scroll
 * position. `load` must be stable (a module-level function or a useCallback).
 */
export function useFocusedQuery<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ignore responses from older requests that finish after a newer one
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const result = await load();
      if (request !== latestRequest.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (request !== latestRequest.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [load]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return { data, loading: data === null && error === null, error, refresh };
}

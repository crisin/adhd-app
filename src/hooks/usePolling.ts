import { useState, useEffect, useCallback, useRef } from 'react';

export function usePolling<T>(fetcher: () => Promise<T>, initial: T, intervalMs = 2000): [T, () => void] {
  const [data, setData] = useState<T>(initial);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(() => {
    fetcherRef.current().then(setData).catch(console.error);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return [data, refresh];
}

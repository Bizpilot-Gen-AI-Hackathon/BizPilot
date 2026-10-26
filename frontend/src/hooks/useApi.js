import { useCallback, useEffect, useState } from "react";

/**
 * Loads data from the API and falls back to mock data if the request fails.
 * Returns { data, loading, isLive, error, reload }.
 * isLive is true only when the data came from the real backend.
 */
export function useApi(fetcher, fallback, deps = []) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher();
      setData(result);
      setIsLive(true);
      setError(null);
    } catch (err) {
      setData(fallback);
      setIsLive(false);
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, isLive, error, reload: load };
}
import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';

/** Executa uma função assíncrona e expõe { data, loading, error, reload }. Refaz quando `deps` mudam. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [tick, setTick] = useState(0);
  const silent = useRef(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (!silent.current) setLoading(true);
      silent.current = false;
      setError(undefined);
      try {
        const result = await fn();
        if (active) setData(result);
      } catch (error) {
        if (active) setError(error as Error);
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => {
    silent.current = true;
    setTick((t) => t + 1);
  }, []);

  return { data, loading, error, reload };
}

import React, { useEffect, useState, ReactNode } from 'react';
import { LoadingState } from './States';

/** Only renders children after client-side hydration to avoid SSR/static mismatches. */
export function ClientOnly({ children, fallback = <LoadingState /> }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  return mounted ? <>{children}</> : fallback;
}
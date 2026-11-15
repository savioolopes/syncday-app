import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/** Chama `refresh` sempre que a tela volta ao foco (exceto na primeira vez). */
export function useRefreshOnFocus(refresh: () => void) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );
}

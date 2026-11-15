import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Prevents the browser from auto-focusing the first focusable element on mount.
 * This is a common React Native Web issue where elements with accessibility roles
 * (like buttons) receive focus on page load, showing a blinking cursor or focus ring.
 */
export function usePreventAutoFocus() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Blur any element that might have received auto-focus
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && activeElement !== document.body) {
        activeElement.blur();
      }
    }
  }, []);
}
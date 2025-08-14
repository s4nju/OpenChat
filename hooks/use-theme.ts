'use client';

import { useEditorStore } from '../store/editor-store';

/**
 * Custom hook that provides theme information
 * Compatible with the previous next-themes interface
 */
export function useTheme() {
  const { themeState, setThemeState } = useEditorStore();

  const setTheme = (mode: 'light' | 'dark' | 'system') => {
    if (mode === 'system') {
      const prefersDark = 
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState({
        ...themeState,
        currentMode: prefersDark ? 'dark' : 'light',
      });
    } else {
      setThemeState({
        ...themeState,
        currentMode: mode,
      });
    }
  };

  return {
    theme: themeState.currentMode,
    resolvedTheme: themeState.currentMode,
    setTheme,
    systemTheme: 
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
  };
}
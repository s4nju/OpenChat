import { COMMON_STYLES } from '../config/theme';
import type {
  ThemeEditorState,
  ThemeStyleProps,
  ThemeStyles,
} from '../types/theme';

type Theme = 'dark' | 'light';

const COMMON_NON_COLOR_KEYS = COMMON_STYLES;

// Helper functions (not exported, used internally by applyThemeToElement)
const updateThemeClass = (root: HTMLElement, mode: Theme) => {
  if (mode === 'light') {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
};

const applyStyleToElement = (
  element: HTMLElement,
  key: string,
  value: string
) => {
  element.style.setProperty(`--${key}`, value);
};

const applyCommonStyles = (root: HTMLElement, themeStyles: ThemeStyleProps) => {
  for (const [key, value] of Object.entries(themeStyles)) {
    if (
      COMMON_NON_COLOR_KEYS.includes(
        key as (typeof COMMON_NON_COLOR_KEYS)[number]
      ) &&
      typeof value === 'string'
    ) {
      applyStyleToElement(root, key, value);
    }
  }
};

const applyThemeColors = (
  root: HTMLElement,
  themeStyles: ThemeStyles,
  mode: Theme
) => {
  for (const [key, value] of Object.entries(themeStyles[mode])) {
    if (
      typeof value === 'string' &&
      !COMMON_NON_COLOR_KEYS.includes(
        key as (typeof COMMON_NON_COLOR_KEYS)[number]
      )
    ) {
      applyStyleToElement(root, key, value);
    }
  }
};

// Exported function to apply theme styles to an element
export const applyThemeToElement = (
  themeState: ThemeEditorState,
  rootElement: HTMLElement
) => {
  const { currentMode: mode, styles: themeStyles } = themeState;

  if (!rootElement) {
    return;
  }

  updateThemeClass(rootElement, mode);
  // Apply common styles (like border-radius) based on the 'light' mode definition
  applyCommonStyles(rootElement, themeStyles.light);
  // Apply mode-specific colors
  applyThemeColors(rootElement, themeStyles, mode);

  // Force inline font application to mitigate stylesheet ordering / hydration race conditions
  try {
    const body = document.body;
    if (body) {
      body.style.fontFamily = 'var(--font-sans)';
    }
    const monoTargets = document.querySelectorAll('code, pre, kbd, samp');
    for (const el of monoTargets) {
      (el as HTMLElement).style.fontFamily = 'var(--font-mono)';
    }
    requestAnimationFrame(() => {
      if (body) {
        body.style.fontFamily = 'var(--font-sans)';
      }
    });
  } catch {
    // Silent: inline font application is a best-effort enhancement.
  }
};

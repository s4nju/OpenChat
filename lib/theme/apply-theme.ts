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

  // Note: Font family is now applied directly through CSS variables set by the theme system
  // No additional font forcing needed since we use actual font names instead of CSS variable references
};

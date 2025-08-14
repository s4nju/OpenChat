'use client';

import { FontSelector } from './font-selector';
import { Label } from './label';
import type { FontOption, FontCategory } from '../../utils/theme-fonts';
import { getCurrentFontSelection } from '../../utils/theme-fonts';
import type { ThemeStyleProps } from '../../types/theme';

interface ThemeFontControlsProps {
  readonly themeStyles: Partial<ThemeStyleProps>;
  readonly onFontChange: (category: FontCategory, fontOption: FontOption) => void;
  readonly disabled?: boolean;
}

export function ThemeFontControls({ 
  themeStyles, 
  onFontChange, 
  disabled = false 
}: ThemeFontControlsProps) {
  const currentSansFont = getCurrentFontSelection(themeStyles, 'sans');
  const currentMonoFont = getCurrentFontSelection(themeStyles, 'mono');

  const handleSansFontChange = (fontOption: FontOption): void => {
    onFontChange('sans', fontOption);
  };

  const handleMonoFontChange = (fontOption: FontOption): void => {
    onFontChange('mono', fontOption);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label 
          htmlFor="sans-font-selector" 
          className="mb-2 block text-sm font-medium"
        >
          Sans-serif Font
        </Label>
        <p className="mb-3 text-muted-foreground text-xs">
          Choose the primary font family for text content.
        </p>
        <FontSelector
          category="sans"
          value={currentSansFont}
          onValueChange={handleSansFontChange}
          disabled={disabled}
          aria-label="Select sans-serif font family"
        />
      </div>

      <div>
        <Label 
          htmlFor="mono-font-selector" 
          className="mb-2 block text-sm font-medium"
        >
          Monospace Font
        </Label>
        <p className="mb-3 text-muted-foreground text-xs">
          Choose the font family for code blocks and monospace text.
        </p>
        <FontSelector
          category="mono"
          value={currentMonoFont}
          onValueChange={handleMonoFontChange}
          disabled={disabled}
          aria-label="Select monospace font family"
        />
      </div>
    </div>
  );
}
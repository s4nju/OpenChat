"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { useEditorStore } from "../../store/editor-store";
import { defaultPresets } from "../../utils/theme-presets";

interface ThemeColorPreviewProps {
  preset: string;
  mode: "light" | "dark";
}

const ColorBox = ({ color }: { color: string }) => (
  <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: color }} />
);

function ThemeColorPreview({ preset, mode }: ThemeColorPreviewProps) {
  const presetData = defaultPresets[preset];
  if (!presetData) return null;

  const colors = presetData.styles[mode];
  
  return (
    <div className="flex gap-0.5 mr-2">
      <ColorBox color={colors.primary || '#000000'} />
      <ColorBox color={colors.accent || '#000000'} />
      <ColorBox color={colors.secondary || '#000000'} />
      <ColorBox color={colors.border || '#000000'} />
    </div>
  );
}

export function ThemeSelector() {
  const { themeState, applyThemePreset } = useEditorStore();

  return (
    <Select value={themeState.preset} onValueChange={applyThemePreset}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select theme">
          <div className="flex items-center">
            {themeState.preset && (
              <ThemeColorPreview preset={themeState.preset} mode={themeState.currentMode} />
            )}
            <span className="ml-1">
              {themeState.preset ? defaultPresets[themeState.preset]?.label || themeState.preset : "Select theme"}
            </span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(defaultPresets).map(([key, preset]) => (
          <SelectItem key={key} value={key}>
            <div className="flex items-center">
              <ThemeColorPreview preset={key} mode={themeState.currentMode} />
              <span>{preset.label || key}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
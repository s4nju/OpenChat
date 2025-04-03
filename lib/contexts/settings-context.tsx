"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useSettingsStore } from '@/lib/stores/settings-store';
import type { ChatSettings, AppearanceSettings, AdvancedSettings } from '@/lib/types';

interface SettingsContextType {
  chatSettings: ChatSettings;
  appearanceSettings: AppearanceSettings;
  advancedSettings: AdvancedSettings;
  setChatSettings: (settings: Partial<ChatSettings>) => void;
  setAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  setAdvancedSettings: (settings: Partial<AdvancedSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const {
    chatSettings,
    appearanceSettings,
    advancedSettings,
    setChatSettings,
    setAppearanceSettings,
    setAdvancedSettings,
    loadSettings,
  } = useSettingsStore();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply appearance settings to the document element
  useEffect(() => {
    // Handle font size
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.documentElement.classList.add(`font-size-${appearanceSettings.fontSize}`);

    // Handle compact mode
    if (appearanceSettings.compactMode) {
      document.documentElement.classList.add('compact-mode');
    } else {
      document.documentElement.classList.remove('compact-mode');
    }

    // Handle message spacing
    document.documentElement.classList.remove(
      'message-spacing-compact',
      'message-spacing-comfortable',
      'message-spacing-spacious'
    );
    document.documentElement.classList.add(`message-spacing-${appearanceSettings.messageSpacing}`);
  }, [appearanceSettings.fontSize, appearanceSettings.compactMode, appearanceSettings.messageSpacing]);

  return (
    <SettingsContext.Provider
      value={{
        chatSettings,
        appearanceSettings,
        advancedSettings,
        setChatSettings,
        setAppearanceSettings,
        setAdvancedSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

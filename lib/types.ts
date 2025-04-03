// Shared type definitions for the application

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string; // ISO string format timestamp
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  isFree: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model?: string;
  createdAt: string;
  updatedAt: string;
}

// Settings types
export interface ChatSettings {
  messageHistoryLength: number;
  autoSaveChats: boolean;
  sendWithEnter: boolean;
  showTimestamps: boolean;
}

export interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  messageSpacing: "compact" | "comfortable" | "spacious";
}

export interface AdvancedSettings {
  debugMode: boolean;
  clearCacheOnStartup: boolean;
  maxTokensPerMessage: number;
}

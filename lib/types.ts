// Shared type definitions for the application

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
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

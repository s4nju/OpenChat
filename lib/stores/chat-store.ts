import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Message, Chat } from '@/lib/types';

interface ChatState {
  // State
  messages: Message[];
  chats: Chat[];
  currentChatId: string;
  chatLoading: boolean;
  error: string | null;
  input: string;
  abortController: AbortController | null;

  // Actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setChats: (chats: Chat[]) => void;
  setCurrentChatId: (id: string) => void;
  setChatLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setInput: (input: string) => void;
  setAbortController: (controller: AbortController | null) => void;

  // Operations
  loadChats: () => void;
  saveChats: (updatedChats: Chat[]) => void;
  saveCurrentChat: (selectedModel?: string) => void;
  createNewChat: (selectedModel?: string) => string;
  deleteChat: (chatId: string) => void;
  clearChat: (selectedModel?: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  handleStopGenerating: () => void;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleExampleClick: (text: string, apiKey?: string, selectedModel?: string) => void;
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>, apiKey?: string, selectedModel?: string) => void;
  processChat: (messagesToProcess: Message[], inputText: string, apiKey?: string, selectedModel?: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // State
  messages: [],
  chats: [],
  currentChatId: '',
  chatLoading: false,
  error: null,
  input: '',
  abortController: null,

  // Actions
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  updateLastMessage: (content) => set((state) => {
    const messages = [...state.messages];
    const lastIndex = messages.length - 1;
    if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
      messages[lastIndex] = {
        ...messages[lastIndex],
        content,
      };
    }
    return { messages };
  }),
  setChats: (chats) => set({ chats }),
  setCurrentChatId: (id) => set({ currentChatId: id }),
  setChatLoading: (isLoading) => set({ chatLoading: isLoading }),
  setError: (error) => set({ error }),
  setInput: (input) => set({ input }),
  setAbortController: (controller) => set({ abortController: controller }),

  // Operations
  loadChats: () => {
    try {
      const storedChats = localStorage.getItem("openchat_history");
      if (storedChats) {
        const parsedChats = JSON.parse(storedChats) as Chat[];
        set({ chats: parsedChats });

        // If there are chats, set the most recent one as current
        if (parsedChats.length > 0) {
          const sortedChats = [...parsedChats].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          set({
            currentChatId: sortedChats[0].id,
            messages: sortedChats[0].messages
          });
        }
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  },

  saveChats: (updatedChats) => {
    try {
      localStorage.setItem("openchat_history", JSON.stringify(updatedChats));
      set({ chats: updatedChats });
    } catch (error) {
      console.error("Failed to save chats:", error);
    }
  },

  saveCurrentChat: (selectedModel) => {
    const { currentChatId, chats, messages } = get();

    if (!currentChatId) return;

    const now = new Date().toISOString();
    const existingChatIndex = chats.findIndex(c => c.id === currentChatId);

    if (existingChatIndex >= 0) {
      const updatedChats = [...chats];
      updatedChats[existingChatIndex] = {
        ...updatedChats[existingChatIndex],
        messages,
        model: selectedModel || updatedChats[existingChatIndex].model,
        updatedAt: now,
        // Generate title from first user message if not already set
        title: updatedChats[existingChatIndex].title ||
              (messages[0]?.content.slice(0, 30) + (messages[0]?.content.length > 30 ? '...' : ''))
      };

      get().saveChats(updatedChats);
    }
  },

  createNewChat: (selectedModel) => {
    const { chats, saveChats } = get();

    const chatId = uuidv4();
    const now = new Date().toISOString();
    const newChat: Chat = {
      id: chatId,
      title: "New Chat",
      messages: [],
      model: selectedModel || "",
      createdAt: now,
      updatedAt: now
    };

    const updatedChats = [newChat, ...chats];
    saveChats(updatedChats);
    set({
      currentChatId: chatId,
      messages: []
    });

    return chatId;
  },

  deleteChat: (chatId) => {
    const { chats, currentChatId } = get();
    const updatedChats = chats.filter(c => c.id !== chatId);
    get().saveChats(updatedChats);

    if (currentChatId === chatId) {
      if (updatedChats.length > 0) {
        set({
          currentChatId: updatedChats[0].id,
          messages: updatedChats[0].messages
        });
      } else {
        set({
          currentChatId: "",
          messages: []
        });
      }
    }
  },

  clearChat: (selectedModel) => {
    const { abortController, messages, currentChatId } = get();
    abortController?.abort();

    // If the current chat is already empty, don't create a new chat
    if (messages.length === 0 && currentChatId) {
      set({
        chatLoading: false,
        error: null,
        abortController: null
      });
      return currentChatId;
    }

    // Otherwise, clear the messages and create a new chat
    set({
      messages: [],
      chatLoading: false,
      error: null,
      abortController: null
    });

    // Create a new chat with the selected model
    return get().createNewChat(selectedModel);
  },

  renameChat: (chatId, newTitle) => {
    if (!newTitle.trim()) return;

    const { chats } = get();
    const updatedChats = chats.map(chat =>
      chat.id === chatId
        ? { ...chat, title: newTitle.trim() }
        : chat
    );

    get().saveChats(updatedChats);
  },

  handleStopGenerating: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ abortController: null });
  },

  handleInputChange: (e) => {
    set({ input: e.target.value });
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  },

  handleExampleClick: async (text, apiKey, selectedModel) => {
    const { currentChatId, chats, createNewChat, messages, processChat } = get();

    set({ input: text });
    const textToSubmit = text;

    // If no current chat, create a new one
    let chatId = currentChatId;
    if (!currentChatId || chats.findIndex(c => c.id === currentChatId) === -1) {
      chatId = createNewChat(selectedModel);
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: textToSubmit.trim(),
      timestamp: new Date().toISOString()
    };
    const updatedMessages = [...messages, userMessage];
    set({ messages: updatedMessages, chatLoading: true });

    const textarea = document.getElementById('chat-input') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.style.height = 'auto';
    }

    await processChat(updatedMessages, textToSubmit.trim(), apiKey, selectedModel);
    set({ input: "" });
  },

  handleSubmit: async (e, apiKey, selectedModel) => {
    e?.preventDefault();

    const { input, currentChatId, chats, createNewChat, messages, processChat } = get();

    if (!apiKey) {
      set({ error: "Please set your OpenRouter API key in the settings." });
      return;
    }

    if (!selectedModel) {
      set({ error: "Please select a model before sending a message." });
      return;
    }

    if (!input.trim()) return;

    // If no current chat, create a new one
    if (!currentChatId || chats.findIndex(c => c.id === currentChatId) === -1) {
      createNewChat(selectedModel);
    }

    set({ error: null });
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString()
    };
    const updatedMessages = [...messages, userMessage];
    set({
      messages: updatedMessages,
      input: "",
      chatLoading: true
    });

    // Save the chat immediately after the user sends a message
    // This updates the timestamp and places the chat at the top of the list
    get().saveCurrentChat(selectedModel);

    const textarea = document.getElementById('chat-input') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.style.height = 'auto';
    }

    // Process the chat with user input
    processChat(updatedMessages, input.trim(), apiKey, selectedModel);
  },

  processChat: async (messagesToProcess, inputText, apiKey, selectedModel) => {
    const { abortController, setAbortController } = get();

    // Clean up any existing abort controller
    abortController?.abort();

    // Create a new abort controller
    const newController = new AbortController();
    setAbortController(newController);
    const signal = newController.signal;

    try {
      const messagesToSend = messagesToProcess.map(({ role, content }) => ({ role, content }));

      // Add request start time for client-side performance monitoring
      const requestStartTime = performance.now();

      // Use optimized API endpoint with retry and better error handling
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Info": navigator.userAgent || 'unknown', // Help with debugging
        },
        body: JSON.stringify({
          messages: messagesToSend,
          apiKey: apiKey?.trim(),
          model: selectedModel
        }),
        signal,
      });

      // Log client-side performance metrics
      const requestDuration = performance.now() - requestStartTime;
      console.log(`Chat request completed in ${requestDuration.toFixed(2)}ms`);

      if (!response.ok || !response.body) {
        let errorMessage = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch { /* Ignore parsing error */ }
        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString()
      };
      let firstChunk = true;
      const messagesEndRef = document.getElementById('messages-end');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              // Skip empty data or malformed JSON
              if (!data || data.trim() === '') continue;

              // Log the raw data for debugging
              console.debug('Received SSE data:', data);

              let parsed;
              try {
                parsed = JSON.parse(data);
              } catch (jsonError) {
                console.warn('Failed to parse JSON:', jsonError, 'Raw data:', data);
                continue; // Skip this chunk if JSON parsing fails
              }

              const contentChunk = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || "";

              if (contentChunk) {
                if (firstChunk) {
                  set((state) => ({
                    messages: [...state.messages, { ...assistantMessage, content: contentChunk }]
                  }));
                  firstChunk = false;
                  // Scroll to bottom with first chunk
                  messagesEndRef?.scrollIntoView({ behavior: "auto", block: "end" });
                } else {
                  set((state) => {
                    const lastMsgIndex = state.messages.length - 1;
                    if (lastMsgIndex >= 0 && state.messages[lastMsgIndex].role === "assistant") {
                      const updatedMsg = {
                        ...state.messages[lastMsgIndex],
                        content: state.messages[lastMsgIndex].content + contentChunk,
                      };
                      // Schedule a scroll for after this update
                      setTimeout(() => {
                        messagesEndRef?.scrollIntoView({ behavior: "auto", block: "end" });
                      }, 0);
                      return { messages: [...state.messages.slice(0, lastMsgIndex), updatedMsg] };
                    }
                    return state;
                  });
                }
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e, "Data:", data);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Chat error:", err);
        set({ error: err.message || "An unknown error occurred" });
        set((state) => {
          const lastMsg = state.messages[state.messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === '') {
            return { messages: state.messages.slice(0, -1) };
          }
          return state;
        });
      }
    } finally {
      set({
        chatLoading: false,
        abortController: null
      });

      // Save the chat after the response is complete to ensure all AI-generated content is saved
      // This also updates the chat's timestamp to reflect the most recent activity
      if (get().messages.length > 0 && get().messages[get().messages.length - 1].role === 'assistant') {
        get().saveCurrentChat(selectedModel);
      }
    }
  }
}));
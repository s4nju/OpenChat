"use client"

import React from "react"
import { useEffect, useRef, useCallback } from "react"
import { useTheme } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SettingsDialog } from "@/components/chat/SettingsDialog"
import { ChatHeader } from "@/components/chat/ChatHeader"
import { MessageList } from "@/components/chat/MessageList"
import { ChatInput } from "@/components/chat/ChatInput"
import MainLayout from "@/components/layouts/MainLayout"
import { useUIInitialize } from "@/hooks/use-ui-initialize"
import { useUIStore } from "@/lib/stores/ui-store"

// Import Zustand stores
import { useChatStore } from "@/lib/stores/chat-store"
import { useSettingsStore } from "@/lib/stores/settings-store"

export default function ChatApp() {
  // Create a messagesEndRef
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const { isMobile } = useUIInitialize();

  // Get state and actions from stores
  const {
    messages,
    chats,
    currentChatId,
    chatLoading,
    error,
    input,
    loadChats,
    handleInputChange,
    handleExampleClick,
    handleSubmit,
    handleStopGenerating,
    saveCurrentChat
  } = useChatStore();

  const {
    apiKey,
    tempApiKey,
    selectedModel,
    models,
    isLoading,
    showFreeOnly,
    settingsOpen,
    chatSettings,
    appearanceSettings,
    advancedSettings,
    setApiKey,
    setTempApiKey,
    setSelectedModel,
    setShowFreeOnly,
    setChatSettings,
    setAppearanceSettings,
    setAdvancedSettings,
    fetchModels,
    saveApiKey,
    saveSettings,
    loadSettings,
    toggleSettings,
    getFilteredModels,
    setSettingsOpen
  } = useSettingsStore();

  // Get filtered models
  const filteredModels = getFilteredModels();

  // --- Effects ---
  // Load API key, settings & chat history from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem("openrouter_api_key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setTempApiKey(storedApiKey);
    }

    // Load chat history
    loadChats();

    // Load settings
    loadSettings();

    // Fetch models
    fetchModels(storedApiKey || "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose the stores to window for cross-store communication
  useEffect(() => {
    // Type casting to avoid TypeScript errors
    (window as any).chatStore = useChatStore.getState;
    (window as any).settingsStore = useSettingsStore.getState;
    (window as any).uiStore = useUIStore.getState;

    return () => {
      delete (window as any).chatStore;
      delete (window as any).settingsStore;
      delete (window as any).uiStore;
    };
  }, []);

  // Scroll to bottom when new user messages are added or on initial load
  useEffect(() => {
    // Only scroll automatically for user messages or when chat is empty
    const isUserMessageAdded = messages.length > 0 && messages[messages.length - 1].role === "user";
    const isEmpty = messages.length === 0;

    if ((isUserMessageAdded || isEmpty) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]); // Only depend on message count, not content

  // Get current chat title
  const currentChat = chats.find(c => c.id === currentChatId);
  const chatTitle = currentChat?.title || "New Chat";

  const boundHandleExampleClick = useCallback((text: string) => {
    handleExampleClick(text, apiKey, selectedModel);
  }, [handleExampleClick, apiKey, selectedModel]);

  const boundHandleSubmit = useCallback((e?: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(e, apiKey, selectedModel);
    if (!apiKey) {
      setSettingsOpen(true);
    }
  }, [handleSubmit, apiKey, selectedModel, setSettingsOpen]);

  const boundSaveCurrentChat = useCallback(() => {
    saveCurrentChat(selectedModel);
  }, [saveCurrentChat, selectedModel]);

  // Function to create a new chat
  const handleNewChat = useCallback(() => {
    // Clear the current chat and start a new one
    useChatStore.getState().clearChat(selectedModel);
  }, [selectedModel]);

  // Add handlers for edit and regenerate functions
  const handleEditMessage = useCallback((id: string, editedContent?: string) => {
    // If we received edited content, this is a direct edit from the MessageItem component
    if (editedContent) {
      // Find the message to edit
      const messageToEdit = messages.find(msg => msg.id === id);
      const messageIndex = messages.findIndex(msg => msg.id === id);

      if (messageToEdit && messageIndex >= 0) {
        // Create a new message array with the updated content
        const messagesBeforeEdit = messages.slice(0, messageIndex);
        const updatedMessage = {
          ...messageToEdit,
          content: editedContent,
          timestamp: new Date().toISOString()
        };

        // Set messages to include all messages before this one, plus the edited message
        useChatStore.getState().setMessages([...messagesBeforeEdit, updatedMessage]);

        // If there are messages after this one, regenerate responses
        if (messageIndex < messages.length - 1) {
          // Process the chat with the edited content to get new responses
          useChatStore.getState().processChat(
            [...messagesBeforeEdit, updatedMessage],
            editedContent,
            apiKey,
            selectedModel
          );
        }

        // Save the current chat
        boundSaveCurrentChat();
        return;
      }
    }

    // Original behavior for assistant messages or fallback
    const messageToEdit = messages.find(msg => msg.id === id);
    if (messageToEdit) {
      // Set the input to the message content
      useChatStore.getState().setInput(messageToEdit.content);

      // Remove this message and all messages after it
      const messageIndex = messages.findIndex(msg => msg.id === id);
      if (messageIndex >= 0) {
        const newMessages = messages.slice(0, messageIndex);
        useChatStore.getState().setMessages(newMessages);
        boundSaveCurrentChat();
      }
    }
  }, [messages, apiKey, selectedModel, boundSaveCurrentChat]);

  const handleRegenerateMessage = useCallback((id: string) => {
    // Find the message to regenerate (which should be a user message)
    const messageIndex = messages.findIndex(msg => msg.id === id);
    if (messageIndex >= 0) {
      // Keep messages up to and including this one, remove any after
      const messagesToKeep = messages.slice(0, messageIndex + 1);

      // Extract the content from the user message
      const userMessage = messages[messageIndex];

      // Set messages to just the ones we're keeping
      useChatStore.getState().setMessages(messagesToKeep);

      // Process the chat with the user message content
      useChatStore.getState().processChat(messagesToKeep, userMessage.content, apiKey, selectedModel);
      boundSaveCurrentChat();
    }
  }, [messages, apiKey, selectedModel, boundSaveCurrentChat]);

  return (
    <TooltipProvider>
      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={settingsOpen}
        onOpenChange={setSettingsOpen}
        apiKey={apiKey}
        tempApiKey={tempApiKey}
        onTempApiKeyChange={setTempApiKey}
        showFreeOnly={showFreeOnly}
        onShowFreeOnlyChange={setShowFreeOnly}
        onSaveApiKey={saveApiKey}
        onFetchModels={() => fetchModels(apiKey)}
        isLoading={isLoading}
        models={models}
        selectedModel={selectedModel}
        chatSettings={chatSettings}
        onChatSettingsChange={setChatSettings}
        appearanceSettings={appearanceSettings}
        onAppearanceSettingsChange={setAppearanceSettings}
        advancedSettings={advancedSettings}
        onAdvancedSettingsChange={setAdvancedSettings}
        onSaveSettings={saveSettings}
      />

      {/* Main Layout with consistent structure */}
      <MainLayout>
        {/* Chat Header */}
        <ChatHeader
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          isLoading={isLoading}
          models={models}
          filteredModels={filteredModels}
          error={error}
          isMobile={isMobile}
          onToggleMobileSheet={() => useUIStore.getState().setMobileSheetOpen(true)}
          chatTitle={chatTitle}
          onRenameChat={useChatStore.getState().renameChat}
          onDeleteChat={useChatStore.getState().deleteChat}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
        />

        {/* Message List */}
        <MessageList
          messages={messages}
          error={error}
          chatLoading={chatLoading}
          messagesEndRef={messagesEndRef}
          isMobile={isMobile}
          onExampleClick={boundHandleExampleClick}
          onEditMessage={handleEditMessage}
          onRegenerateMessage={handleRegenerateMessage}
        />

        {/* Chat Input */}
        <ChatInput
          input={input}
          onInputChange={handleInputChange}
          onSubmit={boundHandleSubmit}
          onStopGenerating={handleStopGenerating}
          isLoading={chatLoading}
          isMobile={isMobile}
        />
      </MainLayout>
    </TooltipProvider>
  )
}

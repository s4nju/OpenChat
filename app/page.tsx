"use client"

import type React from "react" // Ensure React type import is present
import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Settings,
  Plus,
  Sun,
  Moon,
  X, // <-- Add X icon for close button
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent, // Keep Sheet components for Settings
  SheetHeader,  // Remove duplicate imports
  SheetTitle,   // Remove duplicate imports
} from "@/components/ui/sheet"
import { v4 as uuidv4 } from "uuid"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sidebar } from "@/components/chat/Sidebar"
import { SettingsSheet } from "@/components/chat/SettingsSheet"
import { ChatHeader } from "@/components/chat/ChatHeader"
import { MessageList } from "@/components/chat/MessageList"
import { ChatInput } from "@/components/chat/ChatInput" // <-- Import ChatInput
import type { Message, Model, Chat } from "@/lib/types"

// Import Zustand stores
import { useChatStore } from "@/lib/stores/chat-store"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { useUIStore } from "@/lib/stores/ui-store"

export default function ChatApp() {
  // Create a messagesEndRef
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { theme, setTheme } = useTheme();
  
  // Get state and actions from stores
  const {
    messages,
    chats,
    currentChatId,
    chatLoading,
    error,
    input,
    loadChats,
    clearChat,
    handleInputChange,
    handleExampleClick,
    handleSubmit,
    handleStopGenerating,
    renameChat,
    deleteChat,
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
    setApiKey,
    setTempApiKey,
    setSelectedModel,
    setShowFreeOnly,
    fetchModels,
    saveApiKey,
    toggleSettings,
    getFilteredModels,
    setSettingsOpen
  } = useSettingsStore();
  
  const {
    isSidebarCollapsed,
    mobileSheetOpen,
    setIsMobile,
    toggleSidebar,
    setMobileSheetOpen,
    initializeSidebarState
  } = useUIStore();
  
  // Create toggleTheme function using next-themes hook
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");
  
  // Get filtered models
  const filteredModels = getFilteredModels();
  
  // Handle mobile detection
  const isMobileDetected = useIsMobile();
  
  // --- Effects ---
  // Initialize UI with mobile detection
  useEffect(() => {
    if (isMobileDetected !== undefined) {
      setIsMobile(isMobileDetected);
      initializeSidebarState();
    }
  }, [isMobileDetected, setIsMobile, initializeSidebarState]);
  
  // Load API key, theme & chat history from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem("openrouter_api_key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setTempApiKey(storedApiKey);
    }

    // Load chat history
    loadChats();

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

  // Create functions that bind the current state values
  const boundClearChat = () => clearChat(selectedModel);
  
  const boundHandleExampleClick = (text: string) => {
    handleExampleClick(text, apiKey, selectedModel);
  };
  
  const boundHandleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(e, apiKey, selectedModel);
    if (!apiKey) {
      setSettingsOpen(true);
    }
  };
  
  const boundSaveCurrentChat = () => {
    saveCurrentChat(selectedModel);
  };

  // Add handlers for edit and regenerate functions
  const handleEditMessage = (id: string, editedContent?: string) => {
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
  };

  const handleRegenerateMessage = (id: string) => {
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
  };

  return (
    <TooltipProvider>
      {/* Settings Sheet remains outside the main layout flow */}
      <SettingsSheet
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
        />

      {/* Sheet for mobile sidebar */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        {/* Main Layout Container */}
        <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden overscroll-none">
          {/* --- Desktop Sidebar (Conditionally Rendered) --- */}
          {!isMobileDetected && (
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              onNewChat={boundClearChat}
              theme={theme}
              onToggleTheme={toggleTheme}
              onToggleSettings={toggleSettings}
              onToggleSidebar={toggleSidebar}
              chats={chats}
              currentChatId={currentChatId}
              onSelectChat={(chatId) => {
                // Don't save current chat before switching
                // This prevents updating the timestamp unnecessarily
                
                useChatStore.getState().setCurrentChatId(chatId);
                const selectedChat = chats.find(c => c.id === chatId);
                if (selectedChat) {
                  useChatStore.getState().setMessages(selectedChat.messages);
                  if (selectedChat.model) {
                    setSelectedModel(selectedChat.model);
                  }
                }
              }}
              onDeleteChat={deleteChat}
              onRenameChat={renameChat}
            />
          )}

          {/* --- Main Chat Area (Flex Child) --- */}
          {/* Add top safe area padding */}
          <div className="flex flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
            {/* Chat Header */}
            <ChatHeader
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              isLoading={isLoading}
              models={models}
              filteredModels={filteredModels}
              error={error}
              isMobile={isMobileDetected} // Pass isMobile
              onToggleMobileSheet={() => setMobileSheetOpen(true)} // Pass handler to open sheet
              chatTitle={chatTitle}
              onRenameChat={renameChat}
              onDeleteChat={deleteChat}
              currentChatId={currentChatId}
            />

            {/* Message List */}
            <MessageList
              messages={messages}
              error={error}
              chatLoading={chatLoading}
              messagesEndRef={messagesEndRef}
              isMobile={isMobileDetected}
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
              isMobile={isMobileDetected} // Pass isMobile
            />
          </div> {/* Close main chat area div */}
        </div> {/* Close main flex container div */}

        {/* Mobile Sidebar */}
        <Sidebar
          isCollapsed={false} // Mobile sidebar is never collapsed
          onNewChat={boundClearChat}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleSettings={toggleSettings}
          onToggleSidebar={toggleSidebar}
          isMobile={true}
          mobileOpen={mobileSheetOpen}
          onMobileOpenChange={setMobileSheetOpen}
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={(chatId) => {
            // Don't save the current chat when switching
            // This prevents updating the timestamp unnecessarily
            
            useChatStore.getState().setCurrentChatId(chatId);
            const selectedChat = chats.find(c => c.id === chatId);
            if (selectedChat) {
              useChatStore.getState().setMessages(selectedChat.messages);
              if (selectedChat.model) {
                setSelectedModel(selectedChat.model);
              }
            }
            
            // Close mobile sidebar
            setMobileSheetOpen(false);
          }}
          onDeleteChat={deleteChat}
          onRenameChat={renameChat}
        />
      </Sheet> {/* Close Mobile Sheet Wrapper */}
    </TooltipProvider>
  )
}

"use client"

import React, { useCallback } from "react"
import { ChatHeader } from "@/components/chat/ChatHeader"
import { Sidebar } from "@/components/chat/Sidebar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useUIStore } from "@/lib/stores/ui-store"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { useChatStore } from "@/lib/stores/chat-store"
import { useUIInitialize } from "@/hooks/use-ui-initialize"

interface MainLayoutProps {
  children: React.ReactNode
  className?: string
}

export default function MainLayout({ children, className }: MainLayoutProps) {
  // Use hooks
  const { theme, setTheme } = useTheme()
  const { isMobile } = useUIInitialize() // Use our custom hook for UI initialization

  // Get state and actions from stores
  const {
    isSidebarCollapsed,
    mobileSheetOpen,
    toggleSidebar,
    setMobileSheetOpen,
  } = useUIStore()

  const { toggleSettings } = useSettingsStore()

  const {
    chats,
    currentChatId,
    clearChat,
    deleteChat,
    renameChat,
  } = useChatStore()

  // Get current chat title
  const currentChat = chats.find(c => c.id === currentChatId)
  const chatTitle = currentChat?.title || "New Chat"

  // Create toggleTheme function - memoize to prevent recreation on every render
  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light")
  }, [theme, setTheme])

  // Function to clear the current chat - memoize to prevent recreation on every render
  const boundClearChat = useCallback(() => {
    const { selectedModel } = useSettingsStore.getState()
    clearChat(selectedModel)
  }, [clearChat])

  // Handle chat selection - memoize function to prevent recreation on every render
  const handleSelectChat = useCallback((chatId: string) => {
    // Get state and methods from the stores
    const { setCurrentChatId, setMessages } = useChatStore.getState()
    const { setSelectedModel } = useSettingsStore.getState()

    setCurrentChatId(chatId)
    const selectedChat = chats.find(c => c.id === chatId)
    if (selectedChat) {
      setMessages(selectedChat.messages)
      if (selectedChat.model) {
        setSelectedModel(selectedChat.model)
      }
    }
  }, [chats])

  // Handle mobile chat selection - memoize function to prevent recreation on every render
  const handleMobileSelectChat = useCallback((chatId: string) => {
    // Get state and methods from the stores
    const { setCurrentChatId, setMessages } = useChatStore.getState()
    const { setSelectedModel } = useSettingsStore.getState()

    setCurrentChatId(chatId)
    const selectedChat = chats.find(c => c.id === chatId)
    if (selectedChat) {
      setMessages(selectedChat.messages)
      if (selectedChat.model) {
        setSelectedModel(selectedChat.model)
      }
    }

    // Close mobile sidebar
    setMobileSheetOpen(false)
  }, [chats, setMobileSheetOpen])

  return (
    <div className={cn("flex h-screen w-screen bg-background text-foreground overflow-hidden overscroll-none", className)}>
      {/* Desktop Sidebar (Conditionally Rendered) */}
      {!isMobile && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onNewChat={boundClearChat}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleSettings={toggleSettings}
          onToggleSidebar={toggleSidebar}
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onDeleteChat={deleteChat}
          onRenameChat={renameChat}
        />
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
        {/* Children will contain the chat components */}
        {children}
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent
          side="left"
          className="p-0 w-full max-w-[280px] sm:max-w-[320px] pt-safe-top pb-safe-bottom pl-safe-left"
          // Don't show the default close button since we have a custom one in the Sidebar
          hideCloseButton={true}
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
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
            onSelectChat={handleMobileSelectChat}
            onDeleteChat={deleteChat}
            onRenameChat={renameChat}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
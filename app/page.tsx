"use client"

import type React from "react" // Ensure React type import is present
import { useState, useEffect, useRef } from "react"
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
import type { Message, Model } from "@/lib/types"

export default function ChatApp() {
  // State
  const [apiKey, setApiKey] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showFreeOnly, setShowFreeOnly] = useState<boolean>(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>("")
  const [chatLoading, setChatLoading] = useState<boolean>(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tempApiKey, setTempApiKey] = useState("")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // State for desktop sidebar
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false); // <-- New state for mobile sheet

  const messagesEndRef = useRef<HTMLDivElement | null>(null) // Explicitly allow null in the ref type
  const abortControllerRef = useRef<AbortController | null>(null)
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile(); // <-- Use the hook

  // --- Effects ---
  // Load API key & theme from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem("openrouter_api_key")
    if (storedApiKey) {
      setApiKey(storedApiKey)
      setTempApiKey(storedApiKey)
    }
    // Fetch models regardless of sidebar state
    fetchModels(storedApiKey || "")
  }, []) // This effect only handles API key loading and initial model fetch

  // Effect to set initial sidebar state based on mobile status and localStorage
  useEffect(() => {
    // Only run when isMobile is determined (not undefined)
    if (isMobile !== undefined) {
      const storedCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
      // Prioritize mobile: if mobile, collapse. Otherwise, use stored value.
      setIsSidebarCollapsed(isMobile ? true : storedCollapsed);
    }
  }, [isMobile]); // Dependency array ensures this runs when isMobile changes (from undefined to boolean)

  // Save sidebar state to localStorage
  useEffect(() => {
    // Avoid saving during the initial render cycle when isMobile might be undefined
    // or when the initial state is being set by the effect above.
    // We only want to save *user-initiated* changes or changes after the initial mobile check.
    if (isMobile !== undefined) {
       localStorage.setItem("sidebar_collapsed", String(isSidebarCollapsed));
    }
    // Note: Depending only on isSidebarCollapsed might be sufficient if the initial
    // state setting effect runs reliably before any user interaction.
    // Adding isMobile ensures we don't save the potentially incorrect default state.
  }, [isSidebarCollapsed, isMobile]);

  // Fetch models when API key changes
  useEffect(() => {
    if (apiKey) {
      fetchModels(apiKey)
    } else {
      fetchModels("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  // Scroll to bottom when new user messages are added or on initial load
  useEffect(() => {
    // Only scroll automatically for user messages or when chat is empty
    const isUserMessageAdded = messages.length > 0 && messages[messages.length - 1].role === "user";
    const isEmpty = messages.length === 0;
    
    if ((isUserMessageAdded || isEmpty) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]); // Only depend on message count, not content

  // Cleanup function for abort controller
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // --- Functions ---

  const fetchModels = async (currentApiKey: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const headers: HeadersInit = {
        "HTTP-Referer": "https://openchat.dev",
        "X-Title": "OpenChat",
      }
      if (currentApiKey) {
        headers["Authorization"] = `Bearer ${currentApiKey}`
      }

      const response = await fetch("https://openrouter.ai/api/v1/models", { headers })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to fetch models:", response.status, errorText)
        let userError = `Failed to fetch models: ${response.status} ${response.statusText}`
        if (response.status === 401) {
           userError = currentApiKey
             ? "Failed to fetch models: Invalid API Key. Please check your key in Settings."
             : "API Key needed to fetch all models. Add one in Settings or continue with public models."
        }
        setError(userError)
        if (response.status !== 401 || currentApiKey) {
            setModels([])
            setSelectedModel("")
        }
        if (response.status === 401 && !currentApiKey) {
           // Allow parsing public models
        } else {
            return
        }
      }

      const data = await response.json()

      if (data.data && Array.isArray(data.data)) {
        const formattedModels = data.data.map((model: any) => {
          // Determine the base name first
          let baseName = model.name || model.id.split("/").pop() || model.id;

          // Clean the name: remove "(free)" suffix, case-insensitive, handling potential spaces
          const cleanedName = baseName.replace(/\s*\(free\)\s*$/i, '').trim();

          // Determine if it's free based on multiple criteria
          const isActuallyFree = Boolean(
            (model.pricing?.prompt === "0" && model.pricing?.completion === "0") ||
            model.id.endsWith(":free") ||
            baseName.toLowerCase().includes("(free)") // Check original name too
          );

          return {
            id: model.id,
            name: cleanedName, // Use the cleaned name
            provider: model.id.split("/")[0] || "Unknown",
            isFree: isActuallyFree, // Use the determined free status
          };
        });

        setModels(formattedModels)

        const currentModelExists = formattedModels.some((m: Model) => m.id === selectedModel)
        if ((!selectedModel || !currentModelExists) && formattedModels.length > 0) {
          const preferredFreeModelId = "deepseek/deepseek-chat-v3-0324:free"
          const preferredModel = formattedModels.find((m: Model) => m.id === preferredFreeModelId)
          const firstFreeModel = formattedModels.find((m: Model) => m.isFree)
          const firstModel = formattedModels[0]

          if (preferredModel) setSelectedModel(preferredModel.id)
          else if (firstFreeModel) setSelectedModel(firstFreeModel.id)
          else if (firstModel) setSelectedModel(firstModel.id)
        } else if (selectedModel && !currentModelExists) {
            setSelectedModel("")
        }

      } else {
        console.error("Invalid models data format:", data)
        setError("Invalid response format from OpenRouter API")
        setModels([])
        setSelectedModel("")
      }
    } catch (err) {
      console.error("Error fetching models:", err)
      setError(`Failed to fetch models: ${err instanceof Error ? err.message : "Unknown error"}`)
      setModels([])
      setSelectedModel("")
    } finally {
      setIsLoading(false)
    }
  }

  const saveApiKey = () => {
    const trimmedApiKey = tempApiKey.trim()
    if (trimmedApiKey) {
      localStorage.setItem("openrouter_api_key", trimmedApiKey)
      setApiKey(trimmedApiKey)
      setError(null)
      setSettingsOpen(false)
    } else {
      localStorage.removeItem("openrouter_api_key")
      setApiKey("")
      setTempApiKey("")
      setError("API Key removed.")
      setSettingsOpen(false)
    }
  }

  const clearChat = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setMessages([])
    setChatLoading(false)
    setError(null)
  }

  const handleStopGenerating = () => {
    abortControllerRef.current?.abort()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  // Handler for example prompt clicks
  const handleExampleClick = async (text: string) => {
    setInput(text);
    const textToSubmit = text;
    const userMessage: Message = { id: uuidv4(), role: "user", content: textToSubmit.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setChatLoading(true);

    const textarea = document.getElementById('chat-input') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.style.height = 'auto';
    }

    await processChat(updatedMessages, textToSubmit.trim());
    setInput("");
  }

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    if (!apiKey) {
      setError("Please set your OpenRouter API key in the settings.")
      setSettingsOpen(true)
      return
    }
    if (!selectedModel) {
      setError("Please select a model before sending a message.")
      return
    }
    if (!input.trim()) return

    setError(null)
    const userMessage: Message = { id: uuidv4(), role: "user", content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setChatLoading(true)

    const textarea = document.getElementById('chat-input') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.style.height = 'auto';
    }

    // Process the chat with user input
    processChat(updatedMessages, input.trim());
  }

  // Extract the chat processing logic to avoid duplication
  const processChat = async (messagesToProcess: Message[], inputText: string) => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      const messagesToSend = messagesToProcess.map(({ role, content }) => ({ role, content }))
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesToSend, apiKey: apiKey.trim(), model: selectedModel }),
        signal,
      })

      if (!response.ok || !response.body) {
        let errorMessage = `Error: ${response.status} ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch { /* Ignore parsing error */ }
        throw new Error(errorMessage)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage: Message = { id: uuidv4(), role: "assistant", content: "" }
      let firstChunk = true

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter((line) => line.trim() !== "")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") break

            try {
              const parsed = JSON.parse(data)
              const contentChunk = parsed.choices[0]?.delta?.content || ""

              if (contentChunk) {
                if (firstChunk) {
                  setMessages((prev) => [...prev, { ...assistantMessage, content: contentChunk }])
                  firstChunk = false
                  // Scroll to bottom with first chunk
                  messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" })
                } else {
                  setMessages((prev) => {
                    const lastMsgIndex = prev.length - 1
                    if (lastMsgIndex >= 0 && prev[lastMsgIndex].role === "assistant") {
                      const updatedMsg = {
                        ...prev[lastMsgIndex],
                        content: prev[lastMsgIndex].content + contentChunk,
                      }
                      // Schedule a scroll for after this update
                      setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" })
                      }, 0)
                      return [...prev.slice(0, lastMsgIndex), updatedMsg]
                    }
                    return prev
                  })
                }
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e, "Data:", data)
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Chat error:", err)
        setError(err.message || "An unknown error occurred")
        setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === '') {
                return prev.slice(0, -1);
            }
            return prev;
        });
      }
    } finally {
      setChatLoading(false)
      abortControllerRef.current = null
    }
  }

  const filteredModels = showFreeOnly ? models.filter((model) => model.isFree) : models

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");
  const toggleSettings = () => setSettingsOpen(!settingsOpen); // Function to toggle settings sheet

  // Function to close mobile sheet if needed when clicking items inside
  const closeMobileSheet = () => setMobileSheetOpen(false);

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
          onFetchModels={() => fetchModels(apiKey)} // Pass fetchModels bound with current apiKey
          isLoading={isLoading}
          models={models}
          selectedModel={selectedModel}
        />

      {/* Sheet for mobile sidebar */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        {/* Main Layout Container */}
        <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden overscroll-none">
          {/* --- Desktop Sidebar (Conditionally Rendered) --- */}
          {!isMobile && (
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              onNewChat={clearChat}
              theme={theme}
              onToggleTheme={toggleTheme}
              onToggleSettings={toggleSettings}
              onToggleSidebar={toggleSidebar}
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
              isMobile={isMobile} // Pass isMobile
              onToggleMobileSheet={() => setMobileSheetOpen(true)} // Pass handler to open sheet
            />

            {/* Message List */}
            <MessageList
              messages={messages}
              error={error}
              chatLoading={chatLoading}
              messagesEndRef={messagesEndRef}
              isMobile={isMobile}
              onExampleClick={handleExampleClick}
            />

            {/* Chat Input */}
            <ChatInput
              input={input}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onStopGenerating={handleStopGenerating}
              isLoading={chatLoading}
              isMobile={isMobile} // Pass isMobile
            />
          </div> {/* Close main chat area div */}
        </div> {/* Close main flex container div */}

        {/* Mobile Sidebar */}
        <Sidebar
          isCollapsed={false} // Mobile sidebar is never collapsed
          onNewChat={clearChat}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleSettings={toggleSettings}
          onToggleSidebar={toggleSidebar}
          isMobile={true}
          mobileOpen={mobileSheetOpen}
          onMobileOpenChange={setMobileSheetOpen}
        />
      </Sheet> {/* Close Mobile Sheet Wrapper */}
    </TooltipProvider>
  )
}

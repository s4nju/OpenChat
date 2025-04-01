"use client"

import type React from "react" // Ensure React type import is present
import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
// Removed Card imports as we are not using the main card structure anymore
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  Send,
  Settings,
  MessageSquare,
  AlertCircle,
  StopCircle,
  Plus,
  Sun,
  Moon,
  User,
  Bot,
  PanelLeftClose, // Icon for collapsing
  PanelRightClose, // Icon for expanding
  Menu, // <-- Add Menu icon for mobile trigger
  X, // <-- Add X icon for close button
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
// Re-add missing Tooltip imports and keep TooltipProvider
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent, // Keep Sheet components for Settings
  SheetHeader,  // Remove duplicate imports
  SheetTitle,   // Remove duplicate imports
  SheetTrigger, // Keep SheetTrigger if needed elsewhere, otherwise remove if only used in Sidebar
  SheetFooter,
  SheetClose,
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const userMessage: Message = { id: uuidv4(), role: "user", content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setChatLoading(true)

    const textarea = document.getElementById('chat-input') as HTMLTextAreaElement | null;
    if (textarea) {
        textarea.style.height = 'auto';
    }

    try {
      const messagesToSend = updatedMessages.map(({ role, content }) => ({ role, content }))
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
                  setMessages((prev) => [...prev, assistantMessage])
                  firstChunk = false
                }
                setMessages((prev) => {
                  const lastMsgIndex = prev.length - 1
                  if (lastMsgIndex >= 0 && prev[lastMsgIndex].role === "assistant") {
                    const updatedMsg = {
                      ...prev[lastMsgIndex],
                      content: prev[lastMsgIndex].content + contentChunk,
                    }
                    return [...prev.slice(0, lastMsgIndex), updatedMsg]
                  }
                  return prev
                })
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

      {/* Mobile Sheet Wrapper */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        {/* Main Layout Container */}
        <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
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
              isMobile={isMobile} // Pass isMobile
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

        {/* --- Mobile Sheet Content --- */}
        {/* Pass showClose={false} to SheetContent if that prop exists, otherwise need CSS */}
        {/* Explicitly adding bg-background to ensure opacity */}
        <SheetContent side="left" className="p-0 w-64 border-r border-border bg-background">
          {/* Add Header and visually hidden Title for accessibility */}
          <SheetHeader>
            <SheetTitle className="sr-only">Mobile Navigation</SheetTitle>
          </SheetHeader>
          {/* Replicate Sidebar content structure here, adding safe area padding to existing p-2 */}
          <div className="flex h-full flex-col p-2 pt-[calc(0.5rem+env(safe-area-inset-top))] pr-[calc(0.5rem+env(safe-area-inset-right))] pb-[calc(0.5rem+env(safe-area-inset-bottom))] pl-[calc(0.5rem+env(safe-area-inset-left))]">
            {/* Two Separate Buttons with same variant */}
            <div className="flex items-center gap-2 mb-4"> {/* Use gap-2 */}
              {/* Button 1: + New Chat */}
              <Button
                variant="outline" // Use the same variant
                className="flex-1 justify-start gap-2" // Allow button to grow
                onClick={() => { clearChat(); closeMobileSheet(); }}
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">New Chat</span>
              </Button>
              {/* Button 2: X (Close) - Using onClick handler */}
              <Button
                variant="outline" // Use the same variant
                size="icon"
                className="flex-shrink-0" // Prevent shrinking
                onClick={closeMobileSheet} // Add onClick handler
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            {/* Chat History Area (Placeholder) */}
            <ScrollArea className="flex-1">
              <div className="text-sm text-muted-foreground p-2">Chat history (coming soon)</div>
            </ScrollArea>

            {/* Bottom Controls */}
            <div className="mt-auto border-t border-border pt-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => { toggleTheme(); closeMobileSheet(); }}
              >
                {theme === "light" ? <Moon className="h-4 w-4 flex-shrink-0" /> : <Sun className="h-4 w-4 flex-shrink-0" />}
                <span className="whitespace-nowrap">{theme === "light" ? "Dark" : "Light"} Mode</span>
              </Button>

              {/* Settings Trigger */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => { toggleSettings(); closeMobileSheet(); }}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Settings</span>
              </Button>
              {/* No Collapse button needed in mobile sheet */}
            </div>
          </div>
        </SheetContent>
      </Sheet> {/* Close Mobile Sheet Wrapper */}
    </TooltipProvider>
  )
}

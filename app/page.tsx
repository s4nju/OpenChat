"use client"

import type React from "react"
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
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { v4 as uuidv4 } from "uuid"
import { cn } from "@/lib/utils" // Import cn utility
import { useIsMobile } from "@/hooks/use-mobile" // <-- Import useIsMobile

// Types (keep as is)
interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

interface Model {
  id: string
  name: string
  provider: string
  isFree: boolean
}

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // <-- New state for sidebar

  const messagesEndRef = useRef<HTMLDivElement>(null)
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

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);


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

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen bg-background text-foreground">
        {/* --- Sidebar --- */}
        <div
          className={cn(
            "flex h-full flex-col bg-muted/50 p-2 dark:bg-gray-900/50 border-r border-border transition-all duration-300 ease-in-out overflow-hidden",
            isSidebarCollapsed ? "w-16 px-1" : "w-64" // Adjust width and padding when collapsed
          )}
        >
          {/* New Chat Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "mb-4 w-full justify-start gap-2",
                  isSidebarCollapsed && "justify-center px-0" // Center icon when collapsed
                )}
                onClick={clearChat}
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span className="whitespace-nowrap">New Chat</span>}
              </Button>
            </TooltipTrigger>
            {isSidebarCollapsed && <TooltipContent side="right">New Chat</TooltipContent>}
          </Tooltip>

          {/* Chat History Area */}
          <ScrollArea className="flex-1">
            {!isSidebarCollapsed && (
              <div className="text-sm text-muted-foreground p-2">Chat history (coming soon)</div>
            )}
            {/* Add icons or placeholders for chats when collapsed if needed */}
          </ScrollArea>

          {/* Bottom Controls */}
          <div className={cn("mt-auto border-t border-border pt-2", isSidebarCollapsed && "space-y-1")}>
            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={isSidebarCollapsed ? "icon" : "sm"}
                  className={cn("w-full justify-start gap-2", isSidebarCollapsed && "justify-center")}
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                  {theme === "light" ? <Moon className="h-4 w-4 flex-shrink-0" /> : <Sun className="h-4 w-4 flex-shrink-0" />}
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">{theme === "light" ? "Dark" : "Light"} Mode</span>}
                </Button>
              </TooltipTrigger>
              {isSidebarCollapsed && <TooltipContent side="right">{theme === "light" ? "Dark" : "Light"} Mode</TooltipContent>}
            </Tooltip>

            {/* Settings Trigger */}
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size={isSidebarCollapsed ? "icon" : "sm"} className={cn("w-full justify-start gap-2", isSidebarCollapsed && "justify-center")}>
                      <Settings className="h-4 w-4 flex-shrink-0" />
                      {!isSidebarCollapsed && <span className="whitespace-nowrap">Settings</span>}
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
              </Tooltip>
              <SheetContent className="w-[400px] sm:w-[540px]">
                {/* Sheet Content remains the same */}
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  {/* API Key Input */}
                  <div className="space-y-2">
                    <Label htmlFor="api-key">OpenRouter API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder="sk-or-..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Stored locally. Get yours from{" "}
                      <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenRouter</a>.
                    </p>
                  </div>
                  {/* Free Models Toggle */}
                  <div className="flex items-center space-x-2">
                    <Switch id="free-only-settings" checked={showFreeOnly} onCheckedChange={setShowFreeOnly} />
                    <Label htmlFor="free-only-settings">Show free models only</Label>
                  </div>
                  {/* Refresh Models Button */}
                   <Button variant="outline" size="sm" onClick={() => fetchModels(apiKey)} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Refresh Models
                  </Button>
                  {/* Debug Info */}
                  <div className="mt-6 p-4 border rounded-md bg-muted/50 dark:bg-gray-800/50">
                    <h3 className="font-medium mb-2 text-sm">Connection Details</h3>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>API Key Set: {apiKey ? "Yes" : "No"}</p>
                      <p>Selected Model: {selectedModel || "None"}</p>
                      <p>Models Loaded: {models.length}</p>
                      <p>Free Models Available: {models.filter((m) => m.isFree).length}</p>
                    </div>
                  </div>
                </div>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </SheetClose>
                  <Button onClick={saveApiKey}>Save Settings</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            {/* Collapse/Expand Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={isSidebarCollapsed ? "icon" : "sm"}
                  className={cn("w-full justify-start gap-2", isSidebarCollapsed && "justify-center")}
                  onClick={toggleSidebar}
                >
                  {isSidebarCollapsed ? (
                    <PanelRightClose className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
                  )}
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">Collapse</span>}
                </Button>
              </TooltipTrigger>
              {isSidebarCollapsed && <TooltipContent side="right">Expand Sidebar</TooltipContent>}
              {!isSidebarCollapsed && <TooltipContent side="right">Collapse Sidebar</TooltipContent>}
            </Tooltip>
          </div>
        </div>

        {/* --- Main Chat Area --- */}
        <div className="flex flex-1 flex-col">
          {/* Model Selection Header - Moved to justify-start */}
          <div className="flex w-auto items-center justify-start p-2 border-b border-border"> {/* Changed justify-center to justify-start */}
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading || models.length === 0}>
            <SelectTrigger className="w-auto h-9 text-sm">
              <SelectValue placeholder={isLoading ? "Loading models..." : "Select a model"} />
            </SelectTrigger>
            {/* ADD className="w-auto" HERE */}
            <SelectContent className="w-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : models.length === 0 ? (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  {error ? "Error loading models" : "No models found. Check Settings."}
                </div>
              ) : (
                // The mapping code from step 1 goes here
                filteredModels.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-sm">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span title={model.name}>
                        {model.name}
                      </span>
                      {model.isFree && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          Free
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
              {/* Optional: Add other header elements here if needed */}
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4 md:p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {error && !chatLoading && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {messages.length === 0 && !chatLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-20">
                  {/* Placeholder Icon/Logo */}
                   <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4">
                       <Bot className="w-8 h-8 text-primary opacity-80" />
                   </div>
                  {/* <MessageSquare className="h-16 w-16 mb-4 opacity-30" /> */}
                  <p className="text-lg">How can I help you today?</p>
                </div>
              ) : (
                messages.map((message) => (
                  // Apply justify-end for user, justify-start for assistant
                  <div key={message.id} className={cn(
                      "flex w-full items-start gap-3",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {/* AI Icon (Rendered first for AI) */}
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 p-1.5 rounded-full bg-muted">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    {/* Message Content Bubble */}
                    <div className={cn(
                        "max-w-[80%] rounded-lg p-3 text-sm", // Common styles
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground' // User specific styles
                          : 'bg-muted/50 dark:bg-gray-800/50' // Assistant specific styles
                      )}
                    >
                      {/* Basic Markdown-like rendering for code blocks */}
                      {message.content.split('```').map((part, index) => {
                        if (index % 2 === 1) {
                          // Code block part
                          const lines = part.split('\n');
                          const language = lines[0].trim();
                          const code = lines.slice(1).join('\n');
                          return (
                            <pre key={index} className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md overflow-x-auto my-2 text-xs font-mono">
                              {language && <code className="block text-muted-foreground mb-1">{language}</code>}
                              <code>{code}</code>
                            </pre>
                          );
                        } else {
                          // Regular text part
                          return <p key={index} className="whitespace-pre-wrap leading-relaxed">{part}</p>;
                        }
                      })}
                    </div>

                    {/* User Icon (Rendered last for User) */}
                     {message.role === 'user' && (
                       <div className="flex-shrink-0 p-1.5 rounded-full bg-primary text-primary-foreground">
                         <User className="w-4 h-4" />
                       </div>
                     )}
                  </div>
                ))
              )}
              {/* Specific loading indicator for assistant response */}
              {chatLoading && (
                <div className="flex w-full items-start gap-3 justify-start"> {/* Always justify-start for loading */}
                   <div className="flex-shrink-0 p-1.5 rounded-full bg-muted">
                      <Bot className="w-4 h-4" />
                   </div>
                  <div className="flex-1 rounded-lg p-3 bg-muted/50 dark:bg-gray-800/50 max-w-[80%]">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 md:p-6 border-t border-border bg-background">
            <form
                onSubmit={handleSubmit}
                className="max-w-3xl mx-auto flex items-end gap-2 relative"
            >
              <Textarea
                id="chat-input"
                placeholder="Message OpenChat..."
                value={input}
                onChange={handleInputChange}
                className="flex-1 resize-none pr-16 min-h-[40px] max-h-[200px] text-sm py-2"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    if (!chatLoading && input.trim()) {
                      handleSubmit()
                    }
                  }
                }}
                disabled={chatLoading}
              />
              <div className="absolute bottom-1.5 right-1.5 flex items-center">
                {chatLoading ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" onClick={handleStopGenerating} className="h-8 w-8">
                        <StopCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Stop Generating</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="submit" variant="ghost" size="icon" disabled={!input.trim()} className="h-8 w-8">
                        <Send className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send Message</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </form>
             <p className="text-xs text-center text-muted-foreground mt-2">
                OpenChat can make mistakes. Consider checking important information.
             </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

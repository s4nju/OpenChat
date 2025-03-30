"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes" // Import useTheme
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Send, Settings, MessageSquare, AlertCircle, StopCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { v4 as uuidv4 } from "uuid"

// Types
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
  const [activeTab, setActiveTab] = useState<string>("chat")
  // Remove darkMode state: const [darkMode, setDarkMode] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showFreeOnly, setShowFreeOnly] = useState<boolean>(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>("")
  const [chatLoading, setChatLoading] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem("openrouter_api_key")
    if (storedApiKey) {
      setApiKey(storedApiKey)
    }
  }, [])

  // Remove dark mode useEffects

  // Fetch models when API key changes
  useEffect(() => {
    if (apiKey) {
      fetchModels()
    }
  }, [apiKey])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Cleanup function for abort controller
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Fetch available models from OpenRouter
  const fetchModels = async () => {
    setIsLoading(true)
    setError(null)
    try {
      console.log("Fetching models from OpenRouter...")
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://vercel.com",
          "X-Title": "AI Chat App",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to fetch models:", response.status, errorText)
        setError(`Failed to fetch models: ${response.status} ${response.statusText}`)
        return
      }

      const data = await response.json()
      console.log("Models data:", data)

      if (data.data && Array.isArray(data.data)) {
        const formattedModels = data.data.map((model: any) => ({
          id: model.id,
          name: model.name || model.id.split("/").pop(),
          provider: model.id.split("/")[0],
          // Check both pricing and if the model ID ends with :free
          isFree: Boolean(
            (model.pricing?.prompt === 0 && model.pricing?.completion === 0) || model.id.endsWith(":free"),
          ),
        }))

        console.log("Formatted models:", formattedModels)
        console.log(
          "Free models:",
          formattedModels.filter((m: Model) => m.isFree),
        )

        setModels(formattedModels)

        // Set a default model if none is selected
        if (!selectedModel && formattedModels.length > 0) {
          // Try to find a free model first
          const freeModel = formattedModels.find((m: Model) => m.isFree)
          if (freeModel) {
            setSelectedModel(freeModel.id)
          } else {
            setSelectedModel(formattedModels[0].id)
          }
        }
      } else {
        console.error("Invalid models data format:", data)
        setError("Invalid response format from OpenRouter API")
      }
    } catch (err) { // FIX 1: Check if err is Error
      console.error("Error fetching models:", err)
      setError(`Failed to fetch models: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Save API key
  const saveApiKey = () => {
    // Trim the API key to remove any accidental whitespace
    const trimmedApiKey = apiKey.trim()
    localStorage.setItem("openrouter_api_key", trimmedApiKey)
    setApiKey(trimmedApiKey)
    setActiveTab("chat")
    setError(null)
  }

  // Clear chat history and cancel any ongoing requests
  const clearChat = () => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Clear chat state
    setMessages([])
    setChatLoading(false)
    setError(null)
  }

  // Stop generation
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      console.log("Generation stopped by user.")
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!apiKey) {
      setError("Please set your OpenRouter API key in the settings tab.")
      setActiveTab("settings")
      return
    }

    if (!selectedModel) {
      setError("Please select a model before sending a message.")
      return
    }

    if (!input.trim()) {
      return
    }

    setError(null)

    // Cancel any previous ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    // Add user message to chat
    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: input.trim(),
    }

    // Create a copy of messages with the new user message
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setChatLoading(true)

    try {
      // Prepare messages for API
      const messagesToSend = updatedMessages.map(({ role, content }) => ({ role, content }))

      // Call our API route
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messagesToSend,
          apiKey: apiKey.trim(), // Ensure API key is trimmed
          model: selectedModel,
        }),
        signal, // Pass the abort signal
      })

      if (!response.ok) {
        let errorMessage = `Error: ${response.status} ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If we can't parse JSON, use the status text
        }
        throw new Error(errorMessage)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Failed to get response reader")
      }

      // Create a new assistant message
      const assistantMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "",
      }

      setMessages([...updatedMessages, assistantMessage])

      // Process the stream
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        try {
          const { value, done: doneReading } = await reader.read()
          done = doneReading

          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n").filter((line) => line.trim() !== "")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)

              if (data === "[DONE]") {
                break
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices[0]?.delta?.content || ""

                if (content) {
                  // Update the assistant message with new content
                  setMessages((currentMessages) => {
                    if (currentMessages.length === 0) return currentMessages

                    const lastMessage = currentMessages[currentMessages.length - 1]
                    if (lastMessage && lastMessage.role === "assistant") {
                      return [
                        ...currentMessages.slice(0, -1),
                        {
                          ...lastMessage,
                          content: lastMessage.content + content,
                        },
                      ]
                    }
                    return currentMessages
                  })
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e)
              }
            }
          }
        } catch (err) { // FIX 2: Check if err is Error and AbortError
          // Check if this is an abort error
          if (err instanceof Error && err.name === "AbortError") {
            console.log("Request was aborted")
            break
          } else {
            // Re-throw other errors
            console.error("Error reading stream:", err)
            throw err
          }
        }
      }
    } catch (err) { // FIX 3: Check if err is Error and AbortError
      // Don't show errors for aborted requests
      if (!(err instanceof Error && err.name === "AbortError")) {
        console.error("Chat error:", err)
        setError(`${err instanceof Error ? err.message : "Unknown error occurred"}`)

        // Remove the assistant message if it was added
        setMessages((currentMessages) => {
          if (currentMessages.length === 0) return currentMessages

          const lastMessage = currentMessages[currentMessages.length - 1]
          if (lastMessage && lastMessage.role === "assistant" && !lastMessage.content) {
            return currentMessages.slice(0, -1)
          }
          return currentMessages
        })
      }
    } finally {
      // Only clear loading state if this is still the current request
      setChatLoading(false)
    }
  }

  // Filter models based on showFreeOnly
  const filteredModels = showFreeOnly ? models.filter((model) => model.isFree) : models

  // Get theme state and setter from next-themes
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Chat Assistant</CardTitle>
            <div className="flex items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="dark-mode"
                        checked={theme === "dark"}
                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                      />
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle dark mode</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="m-0">
            <CardContent className="p-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : filteredModels.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          No models available. Please check your API key.
                        </div>
                      ) : (
                        filteredModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{model.name}</span>
                              {model.isFree && (
                                <Badge variant="outline" className="ml-2">
                                  Free
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center space-x-2">
                    <Switch id="free-only" checked={showFreeOnly} onCheckedChange={setShowFreeOnly} />
                    <Label htmlFor="free-only">Free models only</Label>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={clearChat} disabled={messages.length === 0}>
                  New Chat
                </Button>
              </div>

              <ScrollArea className="h-[50vh] pr-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (!messages.length || messages[messages.length - 1]?.role !== "assistant") && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <p>AI is thinking...</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>

            <CardFooter className="p-4 pt-0">
              <form onSubmit={handleSubmit} className="w-full">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message here..."
                    value={input}
                    onChange={handleInputChange}
                    className="flex-1 resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        if (input.trim()) {
                          handleSubmit(e as any)
                        }
                      }
                    }}
                  />
                  {chatLoading ? (
                    <Button type="button" variant="destructive" size="icon" onClick={handleStopGenerating}>
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" size="icon" disabled={!input.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </form>
            </CardFooter>
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">OpenRouter API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your OpenRouter API key"
                />
                <p className="text-sm text-muted-foreground">
                  Your API key is stored locally in your browser and never sent to our servers. Get your API key from{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    OpenRouter
                  </a>
                  .
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Note:</strong> Make sure your API key starts with "sk-or-" and doesn't contain any extra
                  spaces.
                </p>
              </div>

              <Button onClick={saveApiKey} disabled={!apiKey}>
                Save Settings
              </Button>

              <div className="mt-6 p-4 border rounded-md bg-muted">
                <h3 className="font-medium mb-2">Debug Information</h3>
                <div className="text-xs space-y-1">
                  <p>
                    API Key: {apiKey ? "✓ Set" : "✗ Not Set"}
                    {apiKey ? ` (${apiKey.substring(0, 7)}...)` : ""}
                  </p>
                  <p>Selected Model: {selectedModel || "None"}</p>
                  <p>Models Loaded: {models.length}</p>
                  <p>Free Models: {models.filter((m) => m.isFree).length}</p>
                  <Button variant="outline" size="sm" onClick={fetchModels} className="mt-2">
                    Refresh Models
                  </Button>
                </div>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

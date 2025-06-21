"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
import { useState, useRef, useEffect } from "react"

// Define the provider type to match the mutation
type Provider = "openrouter" | "openai" | "anthropic" | "mistral" | "meta" | "Qwen" | "gemini"

// API key validation patterns
const API_KEY_PATTERNS = {
  openai: /^sk-[a-zA-Z0-9]{20,}$/,
  anthropic: /^sk-ant-[a-zA-Z0-9_-]{8,}$/,
  gemini: /^AIza[a-zA-Z0-9_-]{35,}$/,
} as const

// Validation function
function validateApiKey(provider: Provider, key: string): { isValid: boolean; error?: string } {
  if (!key.trim()) {
    return { isValid: false, error: "API key is required" }
  }

  const pattern = API_KEY_PATTERNS[provider as keyof typeof API_KEY_PATTERNS]
  if (!pattern) {
    return { isValid: true } // No specific pattern for this provider
  }

  if (!pattern.test(key)) {
    switch (provider) {
      case 'openai':
        return { isValid: false, error: "OpenAI API keys should start with 'sk-' followed by at least 20 characters" }
      case 'anthropic':
        return { isValid: false, error: "Anthropic API keys should start with 'sk-ant-' followed by at least 8 characters (letters, numbers, hyphens, underscores)" }
      case 'gemini':
        return { isValid: false, error: "Google API keys should start with 'AIza' followed by 35+ characters" }
      default:
        return { isValid: false, error: "Invalid API key format" }
    }
  }

  return { isValid: true }
}

const PROVIDERS: Array<{
  id: Provider;
  title: string;
  placeholder: string;
  docs: string;
  models: string[];
}> = [
  {
    id: "anthropic",
    title: "Anthropic API Key",
    placeholder: "sk-ant...",
    docs: "https://console.anthropic.com/account/keys",
    models: [
      "Claude 3.5 Sonnet",
      "Claude 3.7 Sonnet",
      "Claude 3.7 Sonnet (Reasoning)",
      "Claude 4 Opus",
      "Claude 4 Sonnet",
      "Claude 4 Sonnet (Reasoning)",
    ],
  },
  {
    id: "openai",
    title: "OpenAI API Key",
    placeholder: "sk-...",
    docs: "https://platform.openai.com/api-keys",
    models: ["GPT-4.5", "o3", "o3 Pro"],
  },
  {
    id: "gemini",
    title: "Google API Key",
    placeholder: "AIza...",
    docs: "https://console.cloud.google.com/apis/credentials",
    models: [
      "Gemini 2.0 Flash",
      "Gemini 2.0 Flash Lite",
      "Gemini 2.5 Flash",
      "Gemini 2.5 Flash (Thinking)",
      "Gemini 2.5 Flash Lite",
      "Gemini 2.5 Flash Lite (Thinking)",
      "Gemini 2.5 Pro",
    ],
  },
] as const

export default function ApiKeysPage() {
  const apiKeys = useQuery(api.api_keys.getApiKeys) ?? []
  const saveApiKey = useMutation(api.api_keys.saveApiKey)
  const deleteApiKey = useMutation(api.api_keys.deleteApiKey)
  const updateMode = useMutation(api.api_keys.updateApiKeyMode)

  // Use refs to store API key inputs securely - not exposed in React DevTools
  // This prevents sensitive API keys from being visible in component state
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState<Record<string, boolean>>({})

  // Clear all input values on component unmount for security
  useEffect(() => {
    const currentInputs = inputRefs.current
    return () => {
      Object.values(currentInputs).forEach(input => {
        if (input) {
          input.value = ""
        }
      })
    }
  }, [])

  const handleSave = async (provider: Provider) => {
    const inputElement = inputRefs.current[provider]
    const key = inputElement?.value || ""

    if (!key.trim()) return

    // Validate the API key
    const validation = validateApiKey(provider, key)
    if (!validation.isValid) {
      setValidationErrors(prev => ({ ...prev, [provider]: validation.error || "Invalid API key" }))
      return
    }

    // Clear validation error
    setValidationErrors(prev => ({ ...prev, [provider]: "" }))
    setIsValidating(prev => ({ ...prev, [provider]: true }))

    try {
      await saveApiKey({ provider, key })
      toast({ title: "API key saved", status: "success" })

      // Immediately clear the input value for security
      if (inputElement) {
        inputElement.value = ""
      }
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to save key", status: "error" })
    } finally {
      setIsValidating(prev => ({ ...prev, [provider]: false }))
    }
  }

  const handleInputChange = (provider: Provider) => {
    // Clear validation error when user starts typing
    if (validationErrors[provider]) {
      setValidationErrors(prev => ({ ...prev, [provider]: "" }))
    }
  }

  const handleDelete = async (provider: Provider) => {
    if (!confirm("Delete saved API key?")) return
    try {
      await deleteApiKey({ provider })
      toast({ title: "API key deleted", status: "success" })
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to delete key", status: "error" })
    }
  }

  const handleToggle = async (provider: Provider, checked: boolean) => {
    try {
      await updateMode({ provider, mode: checked ? "priority" : "fallback" })
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to update mode", status: "error" })
    }
  }

  const getMode = (provider: Provider) => {
    const apiKey = apiKeys.find((k) => k.provider === provider);
    // Default to "fallback" if mode is not set
    return (apiKey?.mode || "fallback") === "priority";
  }

  const hasKey = (provider: Provider) => {
    return apiKeys.some((k) => k.provider === provider)
  }

  return (
    <div className="w-full">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <div className="space-y-2 mt-2">
            <p className="text-xs text-muted-foreground">
              Bring your own API keys for select models. Messages sent using your API keys will not count towards your monthly limits.
            </p>
            <p className="text-xs text-muted-foreground">
              Note: For optional API key models, you can choose Priority (always use your API key first) or Fallback (use your credits first, then your API key).
            </p>
          </div>
        </div>
        {PROVIDERS.map((p) => (
          <div key={p.id} className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-2.1 2.1a1 1 0 0 0 0 1.4Z" />
                    <path d="m21 2-9.6 9.6" />
                    <circle cx="7.5" cy="15.5" r="5.5" />
                  </svg>
                  {p.title}
                </h3>
                {hasKey(p.id) && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={getMode(p.id)}
                        data-state={getMode(p.id) ? "checked" : "unchecked"}
                        onClick={() => handleToggle(p.id, !getMode(p.id))}
                        className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${getMode(p.id)
                          ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                          : "bg-muted hover:bg-muted/80"
                          }`}
                      >
                        <span
                          data-state={getMode(p.id) ? "checked" : "unchecked"}
                          className="pointer-events-none block h-4 w-4 rounded-full bg-white dark:bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
                        />
                      </button>
                      <label className={`text-sm ${getMode(p.id) ? "text-blue-600 dark:text-blue-400 font-medium" : "text-muted-foreground"}`}>
                        {getMode(p.id) ? "Priority" : "Fallback"}
                      </label>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                        className="size-4"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Used for the following models:</p>
              <div className="flex flex-wrap gap-2">
                {p.models.map((m) => (
                  <span key={m} className="rounded-full bg-secondary px-2 py-1 text-xs">
                    {m}
                  </span>
                ))}
              </div>
            </div>
            {hasKey(p.id) ? (
              <div className="flex items-center gap-2 text-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-4 text-green-500"
                  strokeWidth="2.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>API key configured</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      ref={(el) => {
                        inputRefs.current[p.id] = el
                      }}
                      type="password"
                      placeholder={p.placeholder}
                      onChange={() => handleInputChange(p.id)}
                      className={validationErrors[p.id] ? "border-red-500" : ""}
                    />
                  </div>
                  {validationErrors[p.id] && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="size-3"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {validationErrors[p.id]}
                    </p>
                  )}
                  <p className="prose prose-pink text-xs text-muted-foreground">
                    Get your API key from {" "}
                    <a
                      href={p.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-underline hover:underline"
                    >
                      {p.title.split(" ")[0]}&apos;s Dashboard
                    </a>
                  </p>
                </div>
                <div className="flex w-full justify-end gap-2">
                  <Button
                    onClick={() => handleSave(p.id)}
                    disabled={isValidating[p.id]}
                  >
                    {isValidating[p.id] ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

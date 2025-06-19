"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"

const PROVIDERS = [
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
  const apiKeys = useQuery(api.apiKeys.getApiKeys) ?? []
  const saveApiKey = useMutation(api.apiKeys.saveApiKey)
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey)
  const updateMode = useMutation(api.apiKeys.updateApiKeyMode)
  const [values, setValues] = useState<Record<string, string>>({})

  const handleSave = async (provider: string) => {
    const key = values[provider]
    if (!key) return
    try {
      await saveApiKey({ provider, key })
      toast({ title: "API key saved", status: "success" })
      setValues((v) => ({ ...v, [provider]: "" }))
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to save key", status: "error" })
    }
  }

  const handleDelete = async (provider: string) => {
    if (!confirm("Delete saved API key?")) return
    try {
      await deleteApiKey({ provider })
      toast({ title: "API key deleted", status: "success" })
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to delete key", status: "error" })
    }
  }

  const handleToggle = async (provider: string, checked: boolean) => {
    try {
      await updateMode({ provider, mode: checked ? "priority" : "fallback" })
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to update mode", status: "error" })
    }
  }

  const getMode = (provider: string) => {
    return apiKeys.find((k) => k.provider === provider)?.mode === "priority"
  }

  const hasKey = (provider: string) => {
    return apiKeys.some((k) => k.provider === provider)
  }

  return (
    <div className="w-full">
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-sm text-muted-foreground max-w-prose">
          Bring your own API keys for select models. Messages sent using your API
          keys will not count towards your monthly limits.
        </p>
        {PROVIDERS.map((p) => (
          <div key={p.id} className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  {p.title}
                </h3>
                {hasKey(p.id) && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={getMode(p.id)}
                        onClick={() => handleToggle(p.id, !getMode(p.id))}
                        className="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary"
                      >
                        <span
                          data-state={getMode(p.id) ? "checked" : "unchecked"}
                          className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
                        />
                      </button>
                      <label className="text-sm text-muted-foreground">
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
              <div className="flex items-center gap-2 text-sm text-green-500">
                API key configured
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder={p.placeholder}
                    value={values[p.id] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [p.id]: e.target.value }))
                    }
                  />
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
                  <Button onClick={() => handleSave(p.id)}>Save</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

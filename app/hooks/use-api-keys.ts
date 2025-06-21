"use client"

import { api } from "@/convex/_generated/api"
import { useQuery } from "convex/react"
import { useMemo } from "react"

export function useApiKeys() {
    const apiKeysQuery = useQuery(api.api_keys.getApiKeys)
    const apiKeys = useMemo(() => apiKeysQuery ?? [], [apiKeysQuery])
    const isLoading = apiKeysQuery === undefined

    const hasApiKey = useMemo(() => {
        const keyMap = new Map<string, boolean>()
        apiKeys.forEach(key => {
            keyMap.set(key.provider, true)
        })
        return keyMap
    }, [apiKeys])

    const hasOpenAI = hasApiKey.get("openai") || false
    const hasAnthropic = hasApiKey.get("anthropic") || false
    const hasGemini = hasApiKey.get("gemini") || false

    return {
        apiKeys,
        hasApiKey,
        hasOpenAI,
        hasAnthropic,
        hasGemini,
        isLoading,
    }
}

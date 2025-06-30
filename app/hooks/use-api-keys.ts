'use client';

import { useQuery } from 'convex/react';
import { useMemo } from 'react';
import { api } from '@/convex/_generated/api';

export function useApiKeys() {
  const apiKeysQuery = useQuery(api.api_keys.getApiKeys);
  const apiKeys = useMemo(() => apiKeysQuery ?? [], [apiKeysQuery]);
  const isLoading = apiKeysQuery === undefined;

  const hasApiKey = useMemo(() => {
    const keyMap = new Map<string, boolean>();
    for (const key of apiKeys) {
      keyMap.set(key.provider, true);
    }
    return keyMap;
  }, [apiKeys]);

  const hasOpenAI = hasApiKey.get('openai');
  const hasAnthropic = hasApiKey.get('anthropic');
  const hasGemini = hasApiKey.get('gemini');

  return {
    apiKeys,
    hasApiKey,
    hasOpenAI,
    hasAnthropic,
    hasGemini,
    isLoading,
  };
}

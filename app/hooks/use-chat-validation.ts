/**
 * Chat Validation Hook
 * Handles rate limiting, model validation, and permission checks
 */

import { useConvex } from 'convex/react';
import { useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import { MODELS_MAP, REMAINING_QUERY_ALERT_THRESHOLD } from '@/lib/config';
import { validateQueryParam } from '@/lib/message-utils';
import {
  getModelProvider,
  isModelPremium,
  requiresUserApiKey,
} from '@/lib/model-utils';

export function useChatValidation() {
  const convex = useConvex();

  const checkRateLimits = useCallback(
    async (
      isAuthenticated: boolean,
      setHasDialogAuth: (value: boolean) => void
    ) => {
      try {
        const rateData = await convex.query(api.users.getRateLimitStatus, {});
        const remaining = rateData.effectiveRemaining;
        const plural = remaining === 1 ? 'query' : 'queries';

        if (remaining === 0 && !isAuthenticated) {
          setHasDialogAuth(true);
          return false;
        }

        if (remaining === REMAINING_QUERY_ALERT_THRESHOLD) {
          toast({
            title: `Only ${remaining} ${plural} remaining today.`,
            status: 'info',
          });
        }

        return true;
      } catch {
        // Rate limit check failed - allow the request to proceed
        return false;
      }
    },
    [convex]
  );

  const validateModelAccess = useCallback(
    (
      modelId: string,
      user: Doc<'users'> | null,
      hasPremium: boolean,
      hasApiKey: Map<string, boolean>
    ) => {
      const model = MODELS_MAP[modelId];

      if (!model) {
        toast({ title: 'Model not found', status: 'error' });
        return false;
      }

      if (user?.disabledModels?.includes(modelId)) {
        toast({
          title: 'This model is disabled in your settings',
          status: 'error',
        });
        return false;
      }

      if (isModelPremium(modelId) && !hasPremium) {
        toast({
          title: 'This is a premium model. Please upgrade to use it.',
          status: 'error',
        });
        return false;
      }

      if (requiresUserApiKey(modelId)) {
        const provider = getModelProvider(modelId);
        if (provider && !hasApiKey.get(provider)) {
          toast({
            title: `This model requires an API key for ${provider}`,
            status: 'error',
          });
          return false;
        }
      }

      return true;
    },
    []
  );

  const validateSearchQuery = useCallback((query: string) => {
    return validateQueryParam(query);
  }, []);

  return {
    checkRateLimits,
    validateModelAccess,
    validateSearchQuery,
  };
}

'use client';

import { CheckoutLink, CustomerPortalLink } from '@convex-dev/polar/react';
import { Info } from '@phosphor-icons/react';
import React, { useCallback } from 'react';
import { useSettings } from '@/app/components/layout/settings/settings-provider';
import { useUser } from '@/app/providers/user-provider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { api } from '@/convex/_generated/api';
import { PREMIUM_CREDITS } from '@/lib/config';

function MessageUsageCardComponent() {
  const { user } = useUser();
  const { rateLimitStatus, hasPremium, products } = useSettings();

  // Memoize the format date function
  const formatResetDate = useCallback(
    (timestamp: number | null | undefined) => {
      if (!timestamp) {
        return 'Not available';
      }
      try {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        });
      } catch {
        return 'Error calculating reset time';
      }
    },
    []
  );

  // Memoize product IDs calculation
  const productIds = React.useMemo(() => {
    return products?.premium?.id ? [products.premium.id] : [];
  }, [products?.premium?.id]);

  // Memoize the subscription button renderer
  const renderSubscriptionButton = useCallback(() => {
    if (hasPremium) {
      return (
        <CustomerPortalLink polarApi={api.polar}>
          <button
            className="mt-4 w-full rounded-md bg-primary py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
            type="button"
          >
            Manage Subscription →
          </button>
        </CustomerPortalLink>
      );
    }

    if (productIds.length > 0) {
      return (
        <CheckoutLink
          embed={false}
          polarApi={api.polar}
          productIds={productIds}
        >
          <button
            className="mt-4 w-full rounded-md bg-primary py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
            type="button"
          >
            Subscribe to Premium →
          </button>
        </CheckoutLink>
      );
    }

    return (
      <button
        className="mt-4 w-full cursor-not-allowed rounded-md bg-muted py-2 font-medium text-muted-foreground text-sm"
        disabled
        type="button"
      >
        Loading products...
      </button>
    );
  }, [hasPremium, productIds]);

  if (!(user && rateLimitStatus)) {
    return null;
  }

  // Use the appropriate reset timestamp based on premium status
  const resetTimestamp = hasPremium
    ? rateLimitStatus.monthlyReset
    : rateLimitStatus.dailyReset;
  const nextResetDateStr = formatResetDate(resetTimestamp);

  // Use rate limit status data
  const standardLimit = hasPremium
    ? rateLimitStatus.monthlyLimit
    : rateLimitStatus.dailyLimit;
  const standardCount = hasPremium
    ? rateLimitStatus.monthlyCount
    : rateLimitStatus.dailyCount;
  const standardRemaining = hasPremium
    ? rateLimitStatus.monthlyRemaining
    : rateLimitStatus.dailyRemaining;

  const premiumLimit = PREMIUM_CREDITS;
  // Use actual premium credits from rate limit status
  const premiumCount = rateLimitStatus.premiumCount || 0;
  const premiumRemaining = rateLimitStatus.premiumRemaining || premiumLimit;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-0.5">
        <h3 className="font-semibold">Message Usage</h3>
        <p className="text-muted-foreground text-xs">
          Resets {nextResetDateStr}
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>Standard</span>
            <span>
              {standardCount} / {standardLimit}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{
                width: `${Math.min((standardCount / standardLimit) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            {standardRemaining} messages remaining
          </p>
        </div>
        {hasPremium && (
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="flex items-center gap-1">
                Premium
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info size={14} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Premium credits are used for Claude 4 Sonnet and Grok 3.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
              <span>
                {premiumCount} / {premiumLimit}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-accent"
                style={{
                  width: `${Math.min((premiumCount / premiumLimit) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              {premiumRemaining} messages remaining
            </p>
          </div>
        )}
      </div>
      {renderSubscriptionButton()}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const MessageUsageCard = React.memo(MessageUsageCardComponent);

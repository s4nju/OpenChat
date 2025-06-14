"use client"

import { useUser } from "@/app/providers/user-provider"
import {
  AUTH_DAILY_MESSAGE_LIMIT,
  NON_AUTH_DAILY_MESSAGE_LIMIT,
  PREMIUM_MONTHLY_MESSAGE_LIMIT,
  PREMIUM_CREDITS,
} from "@/lib/config"
import { Info } from "@phosphor-icons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function MessageUsageCard() {
  const { user } = useUser()

  if (!user) return null

  const formatResetDate = (timestamp: number | null) => {
    if (!timestamp) return "Not available"
    try {
      const date = new Date(timestamp)
      return date.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      })
    } catch (error) {
      console.error("Error formatting reset date:", error)
      return "Error calculating reset time"
    }
  }

  const nextMonthlyResetDateStr = formatResetDate(user?.monthlyResetTimestamp ?? null)

  const standardLimit = user.isPremium
    ? PREMIUM_MONTHLY_MESSAGE_LIMIT
    : user.isAnonymous
      ? NON_AUTH_DAILY_MESSAGE_LIMIT
      : AUTH_DAILY_MESSAGE_LIMIT
  const standardCount = user.isPremium ? user.monthlyMessageCount || 0 : user.dailyMessageCount || 0
  const standardRemaining = standardLimit - standardCount

  const premiumLimit = PREMIUM_CREDITS
  const premiumCount = user.premiumCredits || 0
  const premiumRemaining = premiumLimit - premiumCount

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Message Usage</h3>
        <p className="text-muted-foreground text-sm">Resets {nextMonthlyResetDateStr}</p>
      </div>
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>Standard</span>
            <span>
              {standardCount} / {standardLimit}
            </span>
          </div>
          <div className="bg-muted h-2 w-full rounded-full">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${Math.min((standardCount / standardLimit) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">{standardRemaining} messages remaining</p>
        </div>
        {user?.isPremium && (
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
                      <p>Premium credits are used for GPT Image Gen, Claude Sonnet, and Grok 3.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
              <span>
                {premiumCount} / {premiumLimit}
              </span>
            </div>
            <div className="bg-muted h-2 w-full rounded-full">
              <div
                className="bg-accent h-2 rounded-full"
                style={{ width: `${(premiumCount / premiumLimit) * 100}%` }}
              ></div>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">{premiumRemaining} messages remaining</p>
          </div>
        )}
      </div>
      <button className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Buy more premium credits &rarr;
      </button>
    </div>
  )
}

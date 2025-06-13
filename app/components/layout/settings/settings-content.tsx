"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useUser } from "@/app/providers/user-provider"
import { ModelSelector } from "@/components/common/model-selector"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { 
  AUTH_DAILY_MESSAGE_LIMIT,
  NON_AUTH_DAILY_MESSAGE_LIMIT, 
  PREMIUM_MONTHLY_MESSAGE_LIMIT,
  NON_PREMIUM_MONTHLY_MESSAGE_LIMIT,
  MODEL_DEFAULT 
} from "@/lib/config"
import { cn } from "@/lib/utils"
import { SignOut, User, X } from "@phosphor-icons/react"
import { useTheme } from "@/app/providers/theme-provider"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useState } from "react"

// The content previously inside settings.tsx
export function SettingsContent({
  onClose,
  isDrawer = false,
}: {
  onClose: () => void
  isDrawer?: boolean
}) {
  const { user, updateUser, signOut } = useUser()
  const { theme, setTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState(theme || "system")
  const [selectedModelId, setSelectedModelId] = useState<string>(
    user?.preferredModel || MODEL_DEFAULT
  )
  const router = useRouter()

  useEffect(() => {
    if (user?.preferredModel) {
      setSelectedModelId(user.preferredModel)
    }
  }, [user?.preferredModel])

  const handleModelSelection = async (value: string) => {
    setSelectedModelId(value)
    await updateUser({ preferredModel: value })
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
      toast({ title: "Logged out", status: "success" })
    } catch (e) {
      console.error("Sign out failed:", e)
      toast({ title: "Failed to sign out", status: "error" })
    }
  }

  const themes = [
    { id: "system", name: "System", colors: ["#ffffff", "#1a1a1a"] },
    { id: "light", name: "Light", colors: ["#ffffff"] },
    { id: "dark", name: "Dark", colors: ["#1a1a1a"] },
  ]

  // Format date to be more user-friendly, handling UTC times from Supabase
  const formatResetDate = (timestamp: number | null) => {
    if (!timestamp) return "Not available"
    try {
      const now = Date.now()
      const diffMs = timestamp - now
      if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
        const hours = Math.ceil(diffMs / (60 * 60 * 1000))
        return `in ~${hours} hour${hours !== 1 ? "s" : ""}`
      }
      return new Date(timestamp).toLocaleString("en-US", {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch (error) {
      console.error("Error formatting reset date:", error)
      return "Error calculating reset time"
    }
  }

  // Compute next reset timestamps based on last reset + interval
  const nextDailyResetDateStr = formatResetDate(user?.dailyResetTimestamp ?? null)
  const nextMonthlyResetDateStr = formatResetDate(user?.monthlyResetTimestamp ?? null)

  if (!user) return null

  return (
    <div
      className={cn(
        "max-h-[70vh] space-y-0 overflow-y-auto",
        isDrawer ? "p-0 pb-16" : "py-0"
      )}
    >
      {isDrawer && (
        <div className="border-border mb-2 flex items-center justify-between border-b px-4 pb-2">
          <h2 className="text-lg font-medium">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* User Info */}
      <div className="px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="bg-muted flex h-16 w-16 items-center justify-center overflow-hidden rounded-full">
            {user?.image ? (
              <img
                src={user.image || "/placeholder.svg"}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="text-muted-foreground size-8" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium">{user?.name}</h3>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Message Usage */}
      <div className="border-border border-t">
        <div className="px-6 py-4">
          <div className="mb-3 flex justify-between items-center">
            <h3 className="text-sm font-medium">Message Usage</h3>
            {user?.isPremium && (
              <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                Premium
              </span>
            )}
          </div>
          
          {/* Premium Users - Show Monthly Usage */}
          {user?.isPremium && (
            <div className="bg-secondary rounded-lg p-3 mb-3">
              <div className="mb-2 flex justify-between">
                <span className="text-secondary-foreground text-sm">Monthly</span>
                <span className="text-sm font-medium">
                  {user?.monthlyMessageCount || 0} / {PREMIUM_MONTHLY_MESSAGE_LIMIT}{" "}
                  messages
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full rounded-full">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{
                    width: `${
                      ((user?.monthlyMessageCount || 0) / PREMIUM_MONTHLY_MESSAGE_LIMIT) * 100
                    }%`,
                  }}
                ></div>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Limit of {PREMIUM_MONTHLY_MESSAGE_LIMIT} messages per month
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Resets at {nextMonthlyResetDateStr}
              </p>
            </div>
          )}
          
          {/* Regular Users - Show Daily Usage */}
          {!user?.isPremium && (
            <div className="bg-secondary rounded-lg p-3">
              <div className="mb-2 flex justify-between">
                <span className="text-secondary-foreground text-sm">Today</span>
                <span className="text-sm font-medium">
                  {user?.dailyMessageCount || 0} / {user?.isAnonymous ? NON_AUTH_DAILY_MESSAGE_LIMIT : AUTH_DAILY_MESSAGE_LIMIT}{" "}
                  messages
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full rounded-full">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{
                    width: `${
                      ((user?.dailyMessageCount || 0) /
                        (user?.isAnonymous ? NON_AUTH_DAILY_MESSAGE_LIMIT : AUTH_DAILY_MESSAGE_LIMIT)) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Limit of {user?.isAnonymous ? NON_AUTH_DAILY_MESSAGE_LIMIT : AUTH_DAILY_MESSAGE_LIMIT} messages per day
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Resets at {nextDailyResetDateStr}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Theme Selection */}
      <div className="border-border border-t">
        <div className="px-6 py-4">
          <h3 className="mb-3 text-sm font-medium">Theme</h3>
          <div
            className={`grid ${isDrawer ? "grid-cols-2" : "grid-cols-3"} gap-3`}
          >
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  setSelectedTheme(theme.id as "light" | "dark" | "system")
                  setTheme(theme.id as "light" | "dark" | "system")
                }}
                className={`rounded-lg border p-3 ${
                  selectedTheme === theme.id
                    ? "border-primary ring-primary/30 ring-2"
                    : "border-border"
                }`}
              >
                <div className="mb-2 flex space-x-1">
                  {theme.colors.map((color, i) => (
                    <div
                      key={i}
                      className="border-border h-4 w-4 rounded-full border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-left text-sm font-medium">{theme.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div className="border-border border-t">
        <div className="px-6 py-4">
          <h3 className="mb-3 text-sm font-medium">Preferred Model</h3>
          <div className="relative">
            <ModelSelector
              selectedModelId={selectedModelId}
              setSelectedModelId={handleModelSelection}
              className="w-full"
            />
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            This model will be used by default for new conversations
          </p>
        </div>
      </div>

      {/* Sign Out */}
      <div className="border-border border-t">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Account</h3>
              <p className="text-muted-foreground text-xs">
                Log out on this device
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleSignOut}
            >
              <SignOut className="size-4" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

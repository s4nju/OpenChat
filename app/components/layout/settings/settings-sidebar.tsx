"use client"

import { useUser } from "@/app/providers/user-provider"
import React from "react"
import { MessageUsageCard } from "@/app/components/layout/settings/message-usage-card"
import { User, Eye, EyeSlash } from "@phosphor-icons/react"
import { Kbd } from "@/components/ui/kbd"
import Image from "next/image"

export function SettingsSidebar() {
  const { user } = useUser()

  const [showEmail, setShowEmail] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("showEmail") === "true"
  })

  const maskEmail = (email?: string) => {
    if (!email) return ""
    const [local, domain] = email.split("@")
    const tld = domain.substring(domain.lastIndexOf("."))
    const prefix = local.slice(0, 2)
    return `${prefix}*****${tld}`
  }

  if (!user) return null

  return (
    <aside className="w-full space-y-6">
      {/* User Info */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="bg-muted flex h-24 w-24 items-center justify-center overflow-hidden rounded-full">
            {user?.image ? (
              <Image
                src={user.image}
                alt="Profile"
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="text-muted-foreground size-12" />
            )}
          </div>
        </div>
        <h2 className="text-xl font-semibold">{user?.name}</h2>
        <button
          type="button"
          className="text-muted-foreground text-sm flex items-center gap-1"
          onClick={() => {
            setShowEmail(prev => {
              localStorage.setItem("showEmail", (!prev).toString())
              return !prev
            })
          }}
        >
          <span>{showEmail ? user.email : maskEmail(user.email)}</span>
          {showEmail ? <EyeSlash size={14} /> : <Eye size={14} />}
        </button>
        {user?.isPremium && (
          <div className="mt-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              Pro Plan
            </span>
          </div>
        )}
      </div>

      {/* Message Usage */}
      <MessageUsageCard />

      {/* Keyboard Shortcuts */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-4 font-semibold">Keyboard Shortcuts</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Search</span>
            <div className="flex items-center space-x-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">New Chat</span>
            <div className="flex items-center space-x-1">
              <Kbd>⌘</Kbd>
              <Kbd>Shift</Kbd>
              <Kbd>O</Kbd>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Toggle Sidebar</span>
            <div className="flex items-center space-x-1">
              <Kbd>⌘</Kbd>
              <Kbd>B</Kbd>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

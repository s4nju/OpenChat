"use client"

import { useUser } from "@/app/providers/user-provider"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { DrawerSettings } from "@/app/components/layout/settings/drawer-settings"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useState } from "react"
import { User } from "@phosphor-icons/react"
import Link from "next/link"
import type React from "react"

interface SettingsTriggerProps {
  isMenuItem?: boolean
}

export function SettingsTrigger({ isMenuItem = false }: SettingsTriggerProps) {
  const { user } = useUser()

  if (!user) return null

  const isMobileOrTablet = useBreakpoint(896)
  const [isOpen, setIsOpen] = useState(false)

  if (isMenuItem && !isMobileOrTablet) {
    return (
      <DropdownMenuItem asChild>
        <Link href="/settings" className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent focus:bg-accent focus:outline-none">
          <User className="size-4" />
          <span>Settings</span>
        </Link>
      </DropdownMenuItem>
    )
  }

  if (isMenuItem && isMobileOrTablet) {
    const trigger = (
      <button type="button" className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent focus:bg-accent focus:outline-none">
        <User className="size-4" />
        <span>Settings</span>
      </button>
    )
    return (
      <DrawerSettings trigger={trigger} isOpen={isOpen} setIsOpen={setIsOpen} />
    )
  }

  if (isMobileOrTablet) {
    const trigger = (
      <button
        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <User className="size-4" />
      </button>
    )
    return (
      <DrawerSettings trigger={trigger} isOpen={isOpen} setIsOpen={setIsOpen} />
    )
  }

  return (
    <Link
      href="/settings"
      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
    >
      <User className="size-4" />
    </Link>
  )
}

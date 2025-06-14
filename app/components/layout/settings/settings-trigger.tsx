"use client"

import { useUser } from "@/app/providers/user-provider"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { User } from "@phosphor-icons/react"
import Link from "next/link"
import type React from "react"

interface SettingsTriggerProps {
  isMenuItem?: boolean
}

export function SettingsTrigger({ isMenuItem = false }: SettingsTriggerProps) {
  const { user } = useUser()

  if (!user) return null

  if (isMenuItem) {
    return (
      <DropdownMenuItem asChild>
        <Link href="/settings" className="flex items-center gap-2">
          <User className="size-4" />
          <span>Settings</span>
        </Link>
      </DropdownMenuItem>
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

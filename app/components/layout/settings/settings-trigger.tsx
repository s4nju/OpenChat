"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useUser } from "@/app/providers/user-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { User } from "@phosphor-icons/react"
import type React from "react"
import { useState } from "react"
import { SettingsContent } from "./settings-content"

interface SettingsTriggerProps {
  trigger?: React.ReactNode
  isMenuItem?: boolean // Added prop to determine trigger type
}

export function SettingsTrigger({ trigger, isMenuItem = false }: SettingsTriggerProps) {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const isMobile = useBreakpoint(768)

  if (!user) return null

  const defaultTrigger = isMenuItem ? (
    <DropdownMenuItem
      onSelect={(e) => e.preventDefault()}
      onClick={() => setOpen(true)}
    >
      <User className="size-4" />
      <span>Settings</span>
    </DropdownMenuItem>
  ) : (
    <button
      onClick={() => setOpen(true)} // Add onClick to trigger opening
      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
      type="button"
    >
      <User className="size-4" />
    </button>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger || defaultTrigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Settings</DrawerTitle>
            <DrawerDescription className="hidden">Application settings</DrawerDescription>
          </DrawerHeader>
          <SettingsContent isDrawer onClose={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-border border-b px-6 py-4">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">Settings dialog for user preferences and configuration.</DialogDescription>
        <SettingsContent onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
} 
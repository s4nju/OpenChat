"use client"

import { DrawerHistory } from "@/app/components/history/drawer-history"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { CommandHistory } from "@/app/components/history/command-history"
import type { Chats } from "@/lib/chat-store/types"
import { ListMagnifyingGlass } from "@phosphor-icons/react"
import { useState } from "react"

type HistoryTriggerProps = {
  chatHistory: Chats[]
  onSaveEdit: (id: string, newTitle: string) => Promise<void>
  onConfirmDelete: (id: string) => Promise<void>
}

export function HistoryTrigger(props: HistoryTriggerProps) {
  const isMobileOrTablet = useBreakpoint(896)
  const [isOpen, setIsOpen] = useState(false)

  const trigger = (
    <button
      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
      type="button"
      onClick={() => setIsOpen(true)}
    >
      <ListMagnifyingGlass size={24} />
    </button>
  )

  if (isMobileOrTablet) {
    return <DrawerHistory {...props} trigger={trigger} isOpen={isOpen} setIsOpen={setIsOpen} />
  }

  return <CommandHistory {...props} />
} 
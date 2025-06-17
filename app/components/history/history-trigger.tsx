"use client"

import { CommandHistory } from "@/app/components/history/command-history"
import { DrawerHistory } from "@/app/components/history/drawer-history"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { ListMagnifyingGlass } from "@phosphor-icons/react"
import { useState } from "react"

export function HistoryTrigger() {
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
    return (
      <DrawerHistory trigger={trigger} isOpen={isOpen} setIsOpen={setIsOpen} />
    )
  }

  // On desktop, render CommandHistory but hide its trigger button
  return (
    <div className="[&_button]:hidden">
      <CommandHistory />
    </div>
  )
}

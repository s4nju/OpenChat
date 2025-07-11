"use client"

import * as React from "react"
import { ChevronUp, ChevronLeft, Filter,  } from "lucide-react"
import { Button } from "@/components/ui/button"

type ModelSelectorFooterProps = {
  isExtended: boolean
  onToggleMode: () => void
  onFilterClick?: () => void
}

export function ModelSelectorFooter({
  isExtended,
  onToggleMode,
  onFilterClick,
}: ModelSelectorFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between rounded-b-lg bg-popover pb-1 pl-1 pr-2.5 pt-1.5">
      <div className="absolute inset-x-3 top-0 border-b border-chat-border"></div>
      
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 pl-2 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:cursor-pointer"
        onClick={onToggleMode}
      >
        {isExtended ? (
          <>
            <ChevronLeft className="h-4 w-4" />
            <span>Favorites</span>
          </>
        ) : (
          <>
            <ChevronUp className="h-4 w-4" />
            <span>Show all</span>
          </>
        )}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="relative gap-2 px-2 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        onClick={onFilterClick}
      >
        <Filter className="h-4 w-4" />
      </Button>
    </div>
  )
}
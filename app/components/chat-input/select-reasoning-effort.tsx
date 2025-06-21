"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { BrainIcon } from "@phosphor-icons/react"
import React from "react"

type ReasoningEffort = "low" | "medium" | "high"

type SelectReasoningEffortProps = {
  reasoningEffort: ReasoningEffort
  onSelectReasoningEffort: (reasoningEffort: ReasoningEffort) => void
}

export function SelectReasoningEffort({
  reasoningEffort,
  onSelectReasoningEffort,
}: SelectReasoningEffortProps) {
  const isMobile = useBreakpoint(768)
  const hiddenSelectRef = React.useRef<HTMLButtonElement>(null)
  const capitalizedReasoningEffort =
    reasoningEffort.charAt(0).toUpperCase() + reasoningEffort.slice(1)

  return (
    <Select value={reasoningEffort} onValueChange={onSelectReasoningEffort}>
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            {isMobile ? (
              <button
                className="dark:bg-secondary border-input hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/50 size-9 rounded-full border bg-transparent flex items-center justify-center transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  hiddenSelectRef.current?.click()
                }}
              >
                <BrainIcon className="size-4" />
              </button>
            ) : (
              <SelectTrigger className="dark:bg-secondary w-auto gap-2 px-3 justify-between rounded-full">
                <div className="flex items-center gap-2">
                  <BrainIcon className="size-4" />
                  <SelectValue placeholder={capitalizedReasoningEffort} />
                </div>
              </SelectTrigger>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>Select Reasoning Effort</p>
          </TooltipContent>
        </Tooltip>
        {/* Hidden SelectTrigger for mobile positioned behind the visible button */}
        {isMobile && (
          <SelectTrigger
            ref={hiddenSelectRef}
            className="absolute inset-0 opacity-0 pointer-events-none size-9 rounded-full"
          >
            <SelectValue />
          </SelectTrigger>
        )}
      </div>
      <SelectContent>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="high">High</SelectItem>
      </SelectContent>
    </Select>
  )
}

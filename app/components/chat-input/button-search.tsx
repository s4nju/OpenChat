import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Globe } from "@phosphor-icons/react"
import React from "react"
import { PopoverContentAuth } from "./popover-content-auth"

export type ButtonSearchProps = {
  onSearch?: () => void
  isUserAuthenticated: boolean
  searchEnabled?: boolean
}

export function ButtonSearch({
  onSearch,
  isUserAuthenticated,
  searchEnabled = false,
}: ButtonSearchProps) {
  if (!isUserAuthenticated) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="border-border dark:bg-secondary size-9 rounded-full border bg-transparent"
                type="button"
                aria-label="Search the internet"
              >
                <Globe className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Search the internet</TooltipContent>
        </Tooltip>
        <PopoverContentAuth />
      </Popover>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant={searchEnabled ? "default" : "secondary"}
          className={
            "border-border dark:bg-secondary size-9 rounded-full border bg-transparent" +
            (searchEnabled ? " ring-2 ring-primary" : "")
          }
          type="button"
          aria-label="Search the internet"
          onClick={onSearch}
        >
          <Globe className={searchEnabled ? "size-4 text-primary" : "size-4"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Search the internet</TooltipContent>
    </Tooltip>
  )
}

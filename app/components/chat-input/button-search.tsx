import { Button } from "@/components/ui/button"
import { useBreakpoint } from "../../hooks/use-breakpoint"
import {
  Popover,
  // PopoverContent,
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

import { MODELS_OPTIONS } from "@/lib/config"

export type ButtonSearchProps = {
  onSearch?: () => void
  isUserAuthenticated: boolean
  searchEnabled?: boolean
  model: string
}

export function ButtonSearch({
  onSearch,
  isUserAuthenticated,
  searchEnabled = false,
  model,
}: ButtonSearchProps) {
  // Use 640px as the mobile breakpoint (Tailwind 'sm')
  const isMobile = useBreakpoint(768);
  const isWebSearchAvailable = MODELS_OPTIONS.find(
    (m) => m.id === model
  )?.features?.find((f) => f.id === "web-search")?.enabled;

  if (!isWebSearchAvailable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              size="sm"
              variant="secondary"
              className={
                isMobile
                  ? "border-border dark:bg-secondary text-accent-foreground h-9 w-auto rounded-full border bg-transparent opacity-50 cursor-not-allowed"
                  : "border-border dark:bg-secondary size-9 rounded-full border bg-transparent opacity-50 cursor-not-allowed"
              }
              type="button"
              aria-label="Search the internet"
              disabled
            >
              <Globe className="size-5" />
              {/* {isMobile && <span className="text-sm">Search</span>} */}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>This model does not support web search.</TooltipContent>
      </Tooltip>
    );
  }
  if (!isUserAuthenticated) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className={
                  isMobile
                    ? "border-border dark:bg-secondary text-accent-foreground h-9 w-auto rounded-full border bg-transparent"
                    : "border-border dark:bg-secondary size-9 rounded-full border bg-transparent"
                }
                type="button"
                aria-label="Search the internet"
              >
                <Globe className="size-4" />
                {/* {isMobile && <span className="text-sm">Search</span>} */}
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
          variant={searchEnabled ? "ghost" : "secondary"}
          className={
            isMobile
              ? (
                searchEnabled
                  ? "transition bg-blue-500/50 hover:bg-blue-600/50 text-accent-foreground  h-9 w-auto  rounded-full"
                  : "border-border dark:bg-secondary border bg-transparent px-3 h-9 flex items-center w-auto rounded-full"
              )
              : (
                searchEnabled
                  ? "size-9 rounded-full transition bg-blue-500/50 hover:bg-blue-600/50"
                  : "border-border dark:bg-secondary size-9 rounded-full border bg-transparent"
              )
          }
          type="button"
          aria-label="Search the internet"
          onClick={onSearch}
        >
          <Globe className={searchEnabled ? "size-4 text-blue-400" : "size-4"} />
          {/* {isMobile && <span className="text-sm">Search</span>} */}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Search the internet</TooltipContent>
    </Tooltip>
  )
}

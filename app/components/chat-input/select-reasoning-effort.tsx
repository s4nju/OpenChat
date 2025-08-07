'use client';

import { BrainIcon, CaretDownIcon } from '@phosphor-icons/react';
import React from 'react';
import { useBreakpoint } from '@/app/hooks/use-breakpoint';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PopoverContentAuth } from './popover-content-auth';

type ReasoningEffort = 'low' | 'medium' | 'high';

type SelectReasoningEffortProps = {
  reasoningEffort: ReasoningEffort;
  onSelectReasoningEffortAction: (reasoningEffort: ReasoningEffort) => void;
  isUserAuthenticated: boolean;
};

export function SelectReasoningEffort({
  reasoningEffort,
  onSelectReasoningEffortAction,
  isUserAuthenticated,
}: SelectReasoningEffortProps) {
  const isMobile = useBreakpoint(768);
  const hiddenSelectRef = React.useRef<HTMLButtonElement>(null);
  const capitalizedReasoningEffort =
    reasoningEffort.charAt(0).toUpperCase() + reasoningEffort.slice(1);

  if (!isUserAuthenticated) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              {isMobile ? (
                <Button
                  className="flex size-9 items-center justify-center rounded-full border border-input bg-transparent text-accent-foreground dark:bg-secondary"
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <BrainIcon className="size-4" />
                </Button>
              ) : (
                <Button
                  className="h-9 w-auto rounded-full border border-border bg-transparent text-accent-foreground dark:bg-secondary"
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <BrainIcon className="size-4" />
                  {capitalizedReasoningEffort}
                  <CaretDownIcon className="size-4" />
                </Button>
              )}
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select Reasoning Effort</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContentAuth />
      </Popover>
    );
  }

  return (
    <Select
      onValueChange={onSelectReasoningEffortAction}
      value={reasoningEffort}
    >
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            {isMobile ? (
              <button
                className="flex size-9 items-center justify-center rounded-full border border-input bg-transparent outline-none transition-[color,box-shadow] hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-secondary"
                onClick={() => {
                  hiddenSelectRef.current?.click();
                }}
                type="button"
              >
                <BrainIcon className="size-4" />
              </button>
            ) : (
              <SelectTrigger className="w-auto justify-between gap-2 rounded-full px-3 dark:bg-secondary">
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
            className="pointer-events-none absolute inset-0 size-9 rounded-full opacity-0"
            ref={hiddenSelectRef}
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
  );
}

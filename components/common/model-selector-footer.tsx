'use client';

import { CaretLeftIcon, CaretUpIcon, FunnelIcon } from '@phosphor-icons/react';
import * as React from 'react';
import { Button } from '@/components/ui/button';

type ModelSelectorFooterProps = {
  isExtended: boolean;
  onToggleMode: () => void;
  onFilterClick?: () => void;
};

export function ModelSelectorFooter({
  isExtended,
  onToggleMode,
  onFilterClick,
}: ModelSelectorFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between rounded-b-lg bg-popover pt-1.5 pr-2.5 pb-1 pl-1">
      <div className="absolute inset-x-3 top-0 border-chat-border border-b" />

      <Button
        className="flex items-center gap-2 pl-2 text-muted-foreground text-sm hover:cursor-pointer hover:bg-muted/40 hover:text-foreground"
        onClick={onToggleMode}
        size="sm"
        variant="ghost"
      >
        {isExtended ? (
          <>
            <CaretLeftIcon className="h-4 w-4" />
            <span>Favorites</span>
          </>
        ) : (
          <>
            <CaretUpIcon className="h-4 w-4" />
            <span>Show all</span>
          </>
        )}
      </Button>

      <Button
        className="relative gap-2 px-2 text-muted-foreground text-xs hover:bg-muted/40 hover:text-foreground"
        onClick={onFilterClick}
        size="sm"
        variant="ghost"
      >
        <FunnelIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

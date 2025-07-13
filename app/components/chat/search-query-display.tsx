'use client';

import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SearchQuery {
  query: string;
  toolName?: string;
}

interface SearchQueryDisplayProps {
  queries: SearchQuery[];
  className?: string;
}

export function SearchQueryDisplay({
  queries,
  className,
}: SearchQueryDisplayProps) {
  if (!queries || queries.length === 0) {
    return null;
  }

  return (
    <div className={cn('mb-3 flex flex-wrap items-center gap-2', className)}>
      <span className="font-medium text-muted-foreground text-sm">
        Searching
      </span>
      {queries.map((searchQuery, index) => (
        <Badge
          className="flex max-w-full items-center gap-1.5 border-border/50 bg-muted/30 px-2.5 py-1 text-foreground text-sm transition-colors hover:bg-muted/50"
          key={`${searchQuery.toolName}-${searchQuery.query}-${index}`}
          variant="outline"
        >
          <MagnifyingGlassIcon className="size-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="min-w-0 overflow-hidden hyphens-auto break-words font-mono font-thin text-xs">
            {searchQuery.query}
          </span>
        </Badge>
      ))}
    </div>
  );
}

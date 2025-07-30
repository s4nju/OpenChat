import { Globe } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  // PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MODELS_OPTIONS } from '@/lib/config';
import { useBreakpoint } from '../../hooks/use-breakpoint';
import { PopoverContentAuth } from './popover-content-auth';

export type ButtonSearchProps = {
  onSearch?: () => void;
  isUserAuthenticated: boolean;
  searchEnabled?: boolean;
  model: string;
};

export function ButtonSearch({
  onSearch,
  isUserAuthenticated,
  searchEnabled = false,
  model,
}: ButtonSearchProps) {
  // Use 640px as the mobile breakpoint (Tailwind 'sm')
  const isMobile = useBreakpoint(768);
  const isToolCallingAvailable = MODELS_OPTIONS.find(
    (m) => m.id === model
  )?.features?.find((f) => f.id === 'tool-calling')?.enabled;

  // Compute classes for the enabled button state without nested ternaries
  let enabledButtonClass = '';
  if (isMobile) {
    enabledButtonClass = searchEnabled
      ? 'h-9 w-auto rounded-full bg-blue-500/50 text-accent-foreground transition hover:bg-blue-600/50'
      : 'flex h-9 w-auto items-center rounded-full border border-border bg-transparent px-3 dark:bg-secondary';
  } else {
    enabledButtonClass = searchEnabled
      ? 'size-9 rounded-full bg-blue-500/50 transition hover:bg-blue-600/50'
      : 'size-9 rounded-full border border-border bg-transparent dark:bg-secondary';
  }

  if (!isToolCallingAvailable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              aria-label="Search the internet"
              className={
                isMobile
                  ? 'h-9 w-auto cursor-not-allowed rounded-full border border-border bg-transparent text-accent-foreground opacity-50 dark:bg-secondary'
                  : 'size-9 cursor-not-allowed rounded-full border border-border bg-transparent opacity-50 dark:bg-secondary'
              }
              disabled
              size="sm"
              type="button"
              variant="secondary"
            >
              <Globe className="size-5" />
              {/* {isMobile && <span className="text-sm">Search</span>} */}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          This model does not support tool calling.
        </TooltipContent>
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
                aria-label="Search the internet"
                className={
                  isMobile
                    ? 'h-9 w-auto rounded-full border border-border bg-transparent text-accent-foreground dark:bg-secondary'
                    : 'size-9 rounded-full border border-border bg-transparent dark:bg-secondary'
                }
                size="sm"
                type="button"
                variant="secondary"
              >
                <Globe className="size-5" />
                {/* {isMobile && <span className="text-sm">Search</span>} */}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Search the internet</TooltipContent>
        </Tooltip>
        <PopoverContentAuth />
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label="Search the internet"
          className={enabledButtonClass}
          onClick={onSearch}
          size="sm"
          type="button"
          variant={searchEnabled ? 'ghost' : 'secondary'}
        >
          <Globe
            className={searchEnabled ? 'size-5 text-blue-400' : 'size-5'}
          />
          {/* {isMobile && <span className="text-sm">Search</span>} */}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Search the internet</TooltipContent>
    </Tooltip>
  );
}

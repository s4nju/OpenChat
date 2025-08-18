import { CaretDownIcon } from '@phosphor-icons/react';
import { ProviderIcon } from '@/app/components/common/provider-icon';
import { useBreakpoint } from '@/app/hooks/use-breakpoint';
import { ModelSelector } from '@/components/common/model-selector';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MODELS_OPTIONS, PROVIDERS_OPTIONS } from '../../../lib/config';
import { PopoverContentAuth } from './popover-content-auth';

export type SelectModelProps = {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  isUserAuthenticated: boolean;
};

export function SelectModelComponent({
  selectedModel,
  onSelectModel,
  isUserAuthenticated,
}: SelectModelProps) {
  const isMobile = useBreakpoint(768);
  const modelOption = MODELS_OPTIONS.find((m) => m.id === selectedModel);
  const providerOption = PROVIDERS_OPTIONS.find(
    (p) => p.id === modelOption?.provider
  );

  if (!isUserAuthenticated) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                className={cn(
                  'justify-between rounded-full',
                  isMobile && 'py-3'
                )}
                type="button"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  {providerOption && (
                    <ProviderIcon
                      className="size-5"
                      provider={providerOption}
                    />
                  )}
                  <span>{modelOption?.name}</span>
                </div>
                <CaretDownIcon className="size-4 opacity-50" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Select a model</TooltipContent>
        </Tooltip>

        <PopoverContentAuth />
      </Popover>
    );
  }

  return (
    <ModelSelector
      className="rounded-full"
      selectedModelId={selectedModel}
      setSelectedModelId={onSelectModel}
    />
  );
}

export { SelectModelComponent as SelectModel };

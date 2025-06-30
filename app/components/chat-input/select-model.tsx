import { CaretDown } from '@phosphor-icons/react';
import { ModelSelector } from '@/components/common/model-selector';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
                className="h-9 w-auto rounded-full border border-border bg-transparent text-accent-foreground dark:bg-secondary"
                size="sm"
                type="button"
                variant="secondary"
              >
                {providerOption?.icon && (
                  <providerOption.icon className="size-5" />
                )}
                {modelOption?.name}
                <CaretDown className="size-4" />
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

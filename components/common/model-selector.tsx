"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MODELS_OPTIONS, PROVIDERS_OPTIONS } from "@/lib/config"
import { useApiKeys } from "@/app/hooks/use-api-keys"
import { cn } from "@/lib/utils"
import { CaretDown, Eye, FilePdf, Brain, Globe } from "@phosphor-icons/react" // Swapped MagnifyingGlass for Globe for web search feature

type ModelSelectorProps = {
  selectedModelId: string
  setSelectedModelId: (modelId: string) => void
  className?: string
}

export function ModelSelector({
  selectedModelId,
  setSelectedModelId,
  className,
}: ModelSelectorProps) {
  const { apiKeys } = useApiKeys()

  // Transform API keys array to object format expected by getAvailableModels
  const apiKeysObject = React.useMemo(() => {
    return apiKeys.reduce((acc, key) => {
      acc[key.provider] = 'available' // We just need to know if the key exists
      return acc
    }, {} as { [key: string]: string })
  }, [apiKeys])

  const availableModels = React.useMemo(() => {
    return MODELS_OPTIONS.map(model => {
      const userHasKey = !!apiKeysObject[model.provider];
      const isAvailable = model.available !== false && (!model.apiKeyUsage?.userKeyOnly || userHasKey);

      return {
        ...model,
        available: isAvailable,
      };
    });
  }, [apiKeysObject])

  const model = React.useMemo(
    () => availableModels.find((model) => model.id === selectedModelId),
    [selectedModelId, availableModels]
  )
  const provider = React.useMemo(
    () => PROVIDERS_OPTIONS.find((provider) => provider.id === model?.provider),
    [model]
  )

  // Function to render a single model option
  const renderModelOption = (modelOption: (typeof availableModels)[number]) => {
    const providerOption = PROVIDERS_OPTIONS.find(
      (p) => p.id === modelOption.provider
    )
    // Feature Flags
    const hasFileUpload = modelOption.features?.find(
      (feature) => feature.id === "file-upload"
    )?.enabled
    const hasPdfProcessing = modelOption.features?.find(
      (feature) => feature.id === "pdf-processing"
    )?.enabled
    const hasReasoning = modelOption.features?.find(
      (feature) => feature.id === "reasoning"
    )?.enabled
    const hasWebSearch = modelOption.features?.find(
      (feature) => feature.id === "web-search"
    )?.enabled

    // --- Style Definitions based on the provided HTML ---
    const iconWrapperBaseClasses =
      "relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md cursor-help"
    const iconOverlayClasses =
      "absolute inset-0 bg-current opacity-20 dark:opacity-25" // Uses parent's text color
    const iconSizeClasses = "h-4 w-4" // Icon size is smaller than wrapper

    // Define the TEXT color classes for the wrapper (which icon and overlay inherit)
    const visionColorClasses = "text-teal-600 dark:text-teal-600"
    const pdfColorClasses = "text-indigo-600 dark:text-indigo-600" // Matched to file-text example
    const reasoningColorClasses = "text-pink-600 dark:text-pink-600" // Choosing pink for reasoning
    const webSearchColorClasses = "text-blue-600 dark:text-blue-600" // Blue for web search

    return (
      <DropdownMenuItem
        key={modelOption.id}
        className={cn(
          "flex items-center justify-between px-3 py-2",
          !modelOption.available && "cursor-not-allowed opacity-60",
          selectedModelId === modelOption.id && "bg-accent"
        )}
        disabled={!modelOption.available}
        onClick={() => modelOption.available && setSelectedModelId(modelOption.id)}
      >
        <div className="flex items-center gap-3">
          {providerOption?.icon && <providerOption.icon className="size-5" />}
          <span className="text-base">{modelOption.name}</span>
        </div>
        <div className="flex items-center gap-2"> {/* Gap between icons */}
          {hasFileUpload && (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Apply wrapper classes + specific text color */}
                <div className={cn(iconWrapperBaseClasses, visionColorClasses)}>
                  {/* Overlay takes color via bg-current */}
                  <div className={iconOverlayClasses}></div>
                  {/* Icon is placed on top, inherits text color */}
                  <Eye className={cn(iconSizeClasses, "relative")} /> {/* Added relative to ensure it's above overlay */}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Supports Image Upload and Analysis</p>
              </TooltipContent>
            </Tooltip>
          )}
          {hasPdfProcessing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(iconWrapperBaseClasses, pdfColorClasses)}>
                  <div className={iconOverlayClasses}></div>
                  <FilePdf className={cn(iconSizeClasses, "relative")} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Supports PDF Upload and Analysis</p>
              </TooltipContent>
            </Tooltip>
          )}
          {hasReasoning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(iconWrapperBaseClasses, reasoningColorClasses)}>
                  <div className={iconOverlayClasses}></div>
                  <Brain className={cn(iconSizeClasses, "relative")} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Supports reasoning capabilities</p>
              </TooltipContent>
            </Tooltip>
          )}
          {hasWebSearch && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(iconWrapperBaseClasses, webSearchColorClasses)}>
                  <div className={iconOverlayClasses}></div>
                  <Globe className={cn(iconSizeClasses, "relative")} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Supports web search</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </DropdownMenuItem>
    )
  }

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "dark:bg-secondary justify-between",
              className
            )}
          >
            <div className="flex items-center gap-2">
              {provider?.icon && <provider.icon className="size-5" />}
              <span>{model?.name ?? "Select Model"}</span>
            </div>
            <CaretDown className="size-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="max-h-[400px] w-[400px] overflow-y-auto"
          align="start"
          sideOffset={4}
        >
          {/* Available Models Section */}
          {availableModels.filter(model => model.available).length > 0 && (
            <>
              <div className="text-muted-foreground px-3 py-1.5 text-sm font-semibold">
                Available Models
              </div>
              {availableModels.filter(model => model.available).map(renderModelOption)}
            </>
          )}

          {/* API Key Required Section */}
          {availableModels.filter(model => !model.available).length > 0 && (
            <>
              {availableModels.filter(model => model.available).length > 0 && (
                <div className="mx-2 my-1 border-t border-border" />
              )}
              <div className="text-muted-foreground px-3 py-1.5 text-sm font-semibold">
                API Key Required
              </div>
              {availableModels.filter(model => !model.available).map(renderModelOption)}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}

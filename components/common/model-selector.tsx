"use client"

import * as React from "react"
import { CheckoutLink } from "@convex-dev/polar/react"
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
import { MODEL_DEFAULT, MODELS_OPTIONS, PROVIDERS_OPTIONS } from "@/lib/config"
import { useApiKeys } from "@/app/hooks/use-api-keys"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useUser } from "@/app/providers/user-provider"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"
import {
  CaretDownIcon,
  EyeIcon,
  FilePdfIcon,
  BrainIcon,
  GlobeIcon,
  SketchLogoIcon,
} from "@phosphor-icons/react"
import { Key,ImagePlus } from "lucide-react"
import { ProviderIcon } from "@/app/components/common/provider-icon"

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
  const { user, hasPremium, products } = useUser()
  const isMobile = useBreakpoint(768) // Use 768px as the breakpoint

  const handleSelect = React.useCallback((id: string) => {
    setSelectedModelId(id);
  }, [setSelectedModelId]);

  // Get product IDs with fallback
  const productIds = React.useMemo(() => (products?.premium?.id ? [products.premium.id] : []), [products]);

  // Transform API keys array to object format expected by getAvailableModels
  const apiKeysObject = React.useMemo(() => {
    return apiKeys.reduce(
      (acc, key) => {
        acc[key.provider] = "available" // We just need to know if the key exists
        return acc
      },
      {} as { [key: string]: string }
    )
  }, [apiKeys])

  const disabledSet = React.useMemo(() => new Set(user?.disabledModels ?? []), [user]);

  const enabledSet = React.useMemo(() => {
    const allIds = MODELS_OPTIONS.map(m => m.id);
    return new Set(allIds.filter(id => !disabledSet.has(id)));
  }, [disabledSet]);

  const availableModels = React.useMemo(() => {
    const modelsToShow = MODELS_OPTIONS.filter(m => enabledSet.has(m.id))
    const modelsWithAvailability = modelsToShow.map(model => {
      const userHasKey = !!apiKeysObject[model.provider]
      const requiresKey = model.apiKeyUsage.userKeyOnly
      const canUseWithKey = !requiresKey || userHasKey
      const requiresPremium = model.premium
      const canUseAsPremium = !requiresPremium || hasPremium || userHasKey
      const isAvailable = canUseWithKey && canUseAsPremium
      return {
        ...model,
        available: isAvailable,
      }
    })

    // Sort models to show available ones first
    return modelsWithAvailability.sort((a, b) => {
      return b.available === a.available ? 0 : b.available ? 1 : -1
    })
  }, [apiKeysObject, hasPremium, enabledSet])

  React.useEffect(() => {
    if (!enabledSet.has(selectedModelId)) {
      setSelectedModelId(MODEL_DEFAULT)
    }
  }, [enabledSet, selectedModelId, setSelectedModelId])

  const model = React.useMemo(
    () => availableModels.find(model => model.id === selectedModelId),
    [selectedModelId, availableModels]
  )
  const provider = React.useMemo(
    () => PROVIDERS_OPTIONS.find(provider => provider.id === model?.provider),
    [model]
  )

  // Helper function to parse model name and extract reasoning info
  const parseModelName = (name: string) => {
    const reasoningMatch = name.match(/^(.+?)\s*\(reasoning\)$/i)
    if (reasoningMatch) {
      return {
        baseName: reasoningMatch[1].trim(),
        hasReasoningInName: true,
      }
    }
    return {
      baseName: name,
      hasReasoningInName: false,
    }
  }

  const renderModelOption = (modelOption: (typeof availableModels)[number]) => {
    const providerOption = PROVIDERS_OPTIONS.find(
      p => p.id === modelOption.provider
    )
    // Feature Flags
    const hasFileUpload = modelOption.features?.find(
      feature => feature.id === "file-upload"
    )?.enabled
    const hasPdfProcessing = modelOption.features?.find(
      feature => feature.id === "pdf-processing"
    )?.enabled
    const hasReasoning = modelOption.features?.find(
      feature => feature.id === "reasoning"
    )?.enabled
    const hasWebSearch = modelOption.features?.find(
      feature => feature.id === "web-search"
    )?.enabled
    const hasImageGeneration = modelOption.features?.find(
      feature => feature.id === "image-generation"
    )?.enabled

    // --- Style Definitions based on the provided HTML ---
    const iconWrapperBaseClasses =
      "relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md cursor-help"
    const iconOverlayClasses =
      "absolute inset-0 bg-current opacity-20 dark:opacity-25" // Uses parent's text color
    const iconSizeClasses = "h-4 w-4" // Icon size is smaller than wrapper

    // Define the TEXT color classes for the wrapper (which icon and overlay inherit)
    const visionColorClasses = "text-teal-600 dark:text-teal-400"
    const pdfColorClasses = "text-indigo-600 dark:text-indigo-400" // Matched to file-text example
    const reasoningColorClasses = "text-pink-600 dark:text-pink-400" // Choosing pink for reasoning
    const webSearchColorClasses = "text-blue-600 dark:text-blue-400" // Blue for web search
    const imageGenerationColorClasses = "text-orange-600 dark:text-orange-400" // Orange for image generation

    return (
      <DropdownMenuItem
        key={modelOption.id}
        className={cn(
          "flex items-center justify-between px-3 py-2",
          !modelOption.available &&
            "cursor-not-allowed opacity-50 focus:bg-transparent",
          selectedModelId === modelOption.id && "bg-accent"
        )}
        onClick={() =>
          modelOption.available && handleSelect(modelOption.id)
        }
      >
        <div className="flex items-center gap-3">
          {providerOption && (
            <ProviderIcon provider={providerOption} className="size-5" />
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{modelOption.name}</span>
            {modelOption.usesPremiumCredits && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <SketchLogoIcon
                      weight="regular"
                      className="size-3 text-muted-foreground"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Premium Model</p>
                </TooltipContent>
              </Tooltip>
            )}
            {modelOption.apiKeyUsage.userKeyOnly && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <Key className="size-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Requires API Key</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {" "}
          {/* Gap between icons */}
          {hasFileUpload && (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Apply wrapper classes + specific text color */}
                <div className={cn(iconWrapperBaseClasses, visionColorClasses)}>
                  {/* Overlay takes color via bg-current */}
                  <div className={iconOverlayClasses}></div>
                  {/* Icon is placed on top, inherits text color */}
                  <EyeIcon
                    className={cn(iconSizeClasses, "relative", visionColorClasses)}
                  />{" "}
                  {/* Added relative to ensure it's above overlay */}
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
                  <FilePdfIcon className={cn(iconSizeClasses, "relative", pdfColorClasses)} />
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
                <div
                  className={cn(iconWrapperBaseClasses, reasoningColorClasses)}
                >
                  <div className={iconOverlayClasses}></div>
                  <BrainIcon className={cn(iconSizeClasses, "relative", reasoningColorClasses)} />
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
                  <GlobeIcon className={cn(iconSizeClasses, "relative", webSearchColorClasses)} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Supports web search</p>
              </TooltipContent>
            </Tooltip>
          )}
          {hasImageGeneration && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(iconWrapperBaseClasses, imageGenerationColorClasses)}>
                  <div className={iconOverlayClasses}></div>
                  <ImagePlus className={cn(iconSizeClasses, "relative", imageGenerationColorClasses)} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Can generate images</p>
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
              isMobile && "py-3",
            className
          )}
        >
          <div className="flex items-center gap-2">
            {provider && <ProviderIcon provider={provider} className="size-5" />}
            {isMobile ? (
              <div className="flex flex-col items-start">
                <span className="text-sm leading-tight">
                    {parseModelName(model?.name ?? "Select Model").baseName}
                  </span>
                  {model && parseModelName(model.name).hasReasoningInName && (
                    <span className="text-xs text-muted-foreground leading-tight">
                      Reasoning
                    </span>
                  )}
                </div>
              ) : (
                <span>{model?.name ?? "Select Model"}</span>
              )}
            </div>
            <CaretDownIcon className="size-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="max-h-[400px] w-[400px] overflow-y-auto"
          align="start"
          sideOffset={4}
        >
          {!hasPremium && productIds.length > 0 && (
            <>
              <div className="p-3">
                <div className="rounded-lg border bg-card p-4">
                  <div className="mb-2 text-lg font-semibold">
                    Unlock all models + higher limits
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">
                      $15
                      <span className="text-muted-foreground text-sm font-normal">
                        /month
                      </span>
                    </div>
                    <CheckoutLink
                      embed={false}
                      polarApi={api.polar}
                      productIds={productIds}
                    >
                      <Button size="sm" className="cursor-pointer">Upgrade now</Button>
                    </CheckoutLink>
                  </div>
                </div>
              </div>
              <div className="mx-2 my-1 border-t border-border" />
            </>
          )}

          {availableModels.map(modelOption => renderModelOption(modelOption))}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}

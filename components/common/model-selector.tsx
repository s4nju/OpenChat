"use client"

import * as React from "react"
import { useAction } from "convex/react"
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
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useUser } from "@/app/providers/user-provider"
import { useModelPreferences } from "@/app/hooks/use-model-preferences"
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
import { Key, ImagePlus, Pin } from "lucide-react"
import { ProviderIcon } from "@/app/components/common/provider-icon"
import { ModelCard } from "./model-card"
import { ModelSelectorSearchHeader } from "./model-selector-search-header"
import { ModelSelectorFooter } from "./model-selector-footer"

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
  const { user, hasPremium, products, apiKeys } = useUser()
  const { favoriteModels, toggleFavoriteModel } = useModelPreferences()
  const isMobile = useBreakpoint(768) // Use 768px as the breakpoint
  const generateCheckoutLink = useAction(api.polar.generateCheckoutLink)
  
  // State for search and extended mode
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isExtendedMode, setIsExtendedMode] = React.useState(false)

  const handleSelect = React.useCallback((id: string) => {
    setSelectedModelId(id);
  }, [setSelectedModelId]);


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
  const favoritesSet = React.useMemo(() => new Set(favoriteModels), [favoriteModels]);

  // Determine if extended mode should be shown
  const isExtended = searchQuery.length > 0 || isExtendedMode

  // Model filtering logic
  const { normalModeModels, favoritesModels, othersModels } = React.useMemo(() => {
    const addAvailability = (model: typeof MODELS_OPTIONS[0]) => {
      const userHasKey = !!apiKeysObject[model.provider]
      const requiresKey = model.apiKeyUsage.userKeyOnly
      const canUseWithKey = !requiresKey || userHasKey
      const requiresPremium = model.premium
      const canUseAsPremium = !requiresPremium || hasPremium || userHasKey
      const isAvailable = canUseWithKey && canUseAsPremium
      const isEnabled = favoritesSet.has(model.id) || !disabledSet.has(model.id)
      return {
        ...model,
        available: isAvailable,
        enabled: isEnabled,
      }
    }

    // Filter models based on search query
    const filteredModels = MODELS_OPTIONS.filter(model => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        model.name.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query)
      )
    }).map(addAvailability)

    // Normal mode: Only show favorites that are enabled
    const normalModels = filteredModels.filter(model => favoritesSet.has(model.id))

    // Extended mode: Separate favorites and others
    const favorites = filteredModels.filter(model => favoritesSet.has(model.id))
    const others = filteredModels.filter(model => !favoritesSet.has(model.id))

    // Sort by availability (available first)
    const sortByAvailability = (a: any, b: any) => {
      return b.available === a.available ? 0 : b.available ? 1 : -1
    }

    return {
      normalModeModels: normalModels.sort(sortByAvailability),
      favoritesModels: favorites.sort(sortByAvailability),
      othersModels: others.sort(sortByAvailability),
    }
  }, [apiKeysObject, hasPremium, disabledSet, favoritesSet, searchQuery])

  // Ensure selected model is valid
  React.useEffect(() => {
    const allValidModels = isExtended 
      ? [...favoritesModels, ...othersModels]
      : normalModeModels
    
    const selectedModelExists = allValidModels.some(m => m.id === selectedModelId)
    
    if (!selectedModelExists && allValidModels.length > 0) {
      // Try to select first favorite, otherwise first available
      const firstFavorite = favoritesModels.find(m => m.available)
      const firstAvailable = allValidModels.find(m => m.available)
      setSelectedModelId(firstFavorite?.id || firstAvailable?.id || MODEL_DEFAULT)
    }
  }, [selectedModelId, setSelectedModelId, isExtended, favoritesModels, othersModels, normalModeModels])

  // Handle toggle between normal and extended mode
  const handleToggleMode = React.useCallback(() => {
    if (isExtended && searchQuery) {
      // If in extended mode with search, clear search to go back to normal
      setSearchQuery("")
    } else {
      // Toggle extended mode
      setIsExtendedMode(!isExtendedMode)
    }
  }, [isExtended, searchQuery, isExtendedMode])

  // Handle favorite toggle
  const handleToggleFavorite = React.useCallback((modelId: string) => {
    toggleFavoriteModel(modelId)
  }, [toggleFavoriteModel])

  // Handle upgrade button click
  const handleUpgrade = React.useCallback(async () => {
    if (!products?.premium?.id) return
    
    try {
      const { url } = await generateCheckoutLink({
        productIds: [products.premium.id],
        origin: window.location.origin,
        successUrl: `${window.location.origin}/settings?upgraded=true`
      })
      
      window.location.href = url
    } catch (error) {
      console.error("Checkout failed:", error)
    }
  }, [products?.premium?.id, generateCheckoutLink])

  const model = React.useMemo(() => {
    const allModels = [...favoritesModels, ...othersModels, ...normalModeModels]
    return allModels.find(model => model.id === selectedModelId)
  }, [selectedModelId, favoritesModels, othersModels, normalModeModels])
  
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

  const renderModelOption = (modelOption: (typeof MODELS_OPTIONS)[number] & { available: boolean; enabled: boolean }) => {
    const providerOption = PROVIDERS_OPTIONS.find(
      p => p.id === modelOption.provider
    )
    // Feature Flags
    const hasFileUpload = modelOption.features?.find(
      (feature: any) => feature.id === "file-upload"
    )?.enabled
    const hasPdfProcessing = modelOption.features?.find(
      (feature: any) => feature.id === "pdf-processing"
    )?.enabled
    const hasReasoning = modelOption.features?.find(
      (feature: any) => feature.id === "reasoning"
    )?.enabled
    const hasWebSearch = modelOption.features?.find(
      (feature: any) => feature.id === "web-search"
    )?.enabled
    const hasImageGeneration = modelOption.features?.find(
      (feature: any) => feature.id === "image-generation"
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
          className={cn(
            "relative overflow-y-auto rounded-lg !border-none p-0 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-125px)] transition-[height,width] ease-snappy max-sm:mx-4 sm:rounded-lg flex flex-col",
            isExtended ? "sm:w-[640px]" : "sm:w-[420px]"
          )}
          align="start"
          sideOffset={4}
        >
          {/* Fixed Search Header */}
          <ModelSelectorSearchHeader
            value={searchQuery}
            onChange={setSearchQuery}
          />

          {/* Scrollable Content */}
          <div className="px-1.5 py-3">
            {/* Premium Upgrade Section */}
            {!hasPremium && products?.premium?.id && (
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
                      <Button size="sm" onClick={handleUpgrade}>
                        Upgrade now
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mx-2 my-1 border-t border-border" />
              </>
            )}

            {isExtended ? (
              <div className="flex w-full flex-wrap justify-start gap-3.5 pb-4 pl-3 pr-2 pt-2.5">
                {/* Favorites Section */}
                {favoritesModels.length > 0 && (
                  <>
                    <div className="-mb-2 ml-0 flex w-full select-none items-center justify-start gap-1.5 text-color-heading">
                      <Pin className="mt-px size-4" />
                      Favorites
                    </div>
                    {favoritesModels.map(modelOption => (
                      <ModelCard
                        key={modelOption.id}
                        model={modelOption}
                        isSelected={selectedModelId === modelOption.id}
                        isFavorite={true}
                        isLastFavorite={favoritesModels.length === 1}
                        isDisabled={!modelOption.available}
                        onSelect={handleSelect}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </>
                )}

                {/* Others Section */}
                {othersModels.length > 0 && (
                  <>
                    <div className="-mb-2 ml-2 mt-1 w-full select-none text-color-heading">
                      Others
                    </div>
                    {othersModels.map(modelOption => (
                      <ModelCard
                        key={modelOption.id}
                        model={modelOption}
                        isSelected={selectedModelId === modelOption.id}
                        isFavorite={false}
                        isLastFavorite={false}
                        isDisabled={!modelOption.available}
                        onSelect={handleSelect}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </>
                )}
              </div>
            ) : (
              normalModeModels.map(modelOption => renderModelOption(modelOption))
            )}
          </div>

          {/* Fixed Footer */}
          <ModelSelectorFooter
            isExtended={isExtended}
            onToggleMode={handleToggleMode}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}

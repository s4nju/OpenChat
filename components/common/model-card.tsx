"use client"

import * as React from "react"
import {
  BrainIcon,
  EyeIcon,
  FilePdfIcon,
  SketchLogoIcon,
} from "@phosphor-icons/react"
import { ImagePlus, Key, Pin, PinOff, Wrench } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PROVIDERS_OPTIONS } from "@/lib/config"
import { cn } from "@/lib/utils"
import { ProviderIcon } from "@/app/components/common/provider-icon"
import { useMemo } from "react"

type Model = {
  id: string
  name: string
  subName?: string
  provider: string
  premium: boolean
  usesPremiumCredits: boolean
  description: string
  apiKeyUsage: {
    allowUserKey: boolean
    userKeyOnly: boolean
  }
  features: Array<{
    id: string
    enabled: boolean
    label?: string
  }>
}

type ModelCardProps = {
  model: Model
  isSelected: boolean
  isFavorite: boolean
  isDisabled: boolean
  isLastFavorite?: boolean
  onSelect: (modelId: string) => void
  onToggleFavorite: (modelId: string) => void
}

export const ModelCard = React.memo(function ModelCard({
  model,
  isSelected,
  isFavorite,
  isDisabled,
  isLastFavorite = false,
  onSelect,
  onToggleFavorite,
}: ModelCardProps) {
  const provider = PROVIDERS_OPTIONS.find(p => p.id === model.provider)

  // Feature flags
  // Pre-compute features map for O(1) lookups
  const featuresMap = useMemo(() => {
    return model.features?.reduce((acc, feature) => {
      acc[feature.id] = feature.enabled;
      return acc;
    }, {} as Record<string, boolean>) || {};
  }, [model.features]);

  // Feature flags - O(1) lookups
  const hasFileUpload = featuresMap["file-upload"];
  const hasPdfProcessing = featuresMap["pdf-processing"];
  const hasReasoning = featuresMap["reasoning"];
  const hasToolCalling = featuresMap["tool-calling"];
  const hasImageGeneration = featuresMap["image-generation"];
  // Style definitions for feature icons
  const iconWrapperBaseClasses =
    "relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md cursor-help"
  const iconOverlayClasses =
    "absolute inset-0 bg-current opacity-20 dark:opacity-25"
  const iconSizeClasses = "h-4 w-4"

  // Color classes for features
  const visionColorClasses = "text-teal-600 dark:text-teal-400"
  const pdfColorClasses = "text-indigo-600 dark:text-indigo-400"
  const reasoningColorClasses = "text-pink-600 dark:text-pink-400"
  const toolCallingColorClasses = "text-blue-600 dark:text-blue-400"
  const imageGenerationColorClasses = "text-orange-600 dark:text-orange-400"

  const handleCardClick = React.useCallback(() => {
    if (!isDisabled) {
      onSelect(model.id)
    }
  }, [isDisabled, onSelect, model.id])

  const handleToggleFavorite = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Prevent unpinning if this is the last favorite
    if (isFavorite && isLastFavorite) {
      return
    }
    onToggleFavorite(model.id)
  }, [isFavorite, isLastFavorite, onToggleFavorite, model.id])

  // Helper function to format display name with subName
  const getDisplayName = React.useCallback((modelName: string, subName?: string) => {
    return subName ? `${modelName} (${subName})` : modelName
  }, [])

  // Use the full display name including subName - memoized
  const { displayName, firstName, restName } = React.useMemo(() => {
    const displayName = getDisplayName(model.name, model.subName)
    const nameParts = displayName.split(" ")
    const firstName = nameParts[0] || ""
    const restName = nameParts.slice(1).join(" ")
    return { displayName, firstName, restName }
  }, [model.name, model.subName, getDisplayName])

  // Memoized tooltip content
  const { tooltipContentParts, tooltipDisplay } = React.useMemo(() => {
    const tooltipContentParts: React.ReactNode[] = []
    if (model.usesPremiumCredits) {
      tooltipContentParts.push(
        <span key="premium" className="flex items-center gap-1">
          <SketchLogoIcon weight="regular" className="size-3" />
          Premium
        </span>
      )
    }
    if (model.apiKeyUsage.userKeyOnly) {
      tooltipContentParts.push(
        <span key="apikey" className="flex items-center gap-1">
          <Key className="size-3" />
          Requires API Key
        </span>
      )
    }

    const shortDescription = model.description?.split(".")[0]
    if (shortDescription) {
      // Limit description length for tooltip display
      const truncated = shortDescription.length > 100
        ? shortDescription.substring(0, 97) + "..."
        : shortDescription
      tooltipContentParts.push(<span key="desc">{truncated}</span>)
    }

    const tooltipDisplay = (
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground">
        {tooltipContentParts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < tooltipContentParts.length - 1 && (
              <span className="text-muted-foreground">·</span>
            )}
          </React.Fragment>
        ))}
      </div>
    )
    
    return { tooltipContentParts, tooltipDisplay }
  }, [model.usesPremiumCredits, model.apiKeyUsage.userKeyOnly, model.description])

  return (
    <div className="group relative" data-state="closed">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "group relative flex h-[9.25rem] w-[6.75rem] cursor-pointer flex-col items-start gap-0.5 overflow-hidden rounded-xl border border-chat-border/50 bg-sidebar/20 px-1 py-3 text-color-heading transition-colors",
              "[--model-muted:hsl(var(--muted-foreground)/0.9)] [--model-primary:hsl(var(--color-heading))]",
              "hover:bg-accent/30 hover:text-color-heading",
              "dark:border-chat-border",
              "dark:[--model-muted:hsl(var(--color-heading))] dark:[--model-primary:hsl(var(--muted-foreground)/0.9)]",
              "dark:hover:bg-accent/30",
              isSelected && "ring-2 ring-primary",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleCardClick}
            disabled={isDisabled}
          >
            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              {model.apiKeyUsage.userKeyOnly && (
                <Key className="size-4 text-muted-foreground" />
              )}
              {model.usesPremiumCredits && (
                <SketchLogoIcon
                  weight="regular"
                  className="size-4 text-muted-foreground"
                />
              )}
            </div>
            <div className="flex w-full flex-col items-center justify-center gap-1 font-medium transition-colors">
              {provider && (
                <ProviderIcon
                  provider={provider}
                  className="size-7 text-[--model-primary]"
                />
              )}
              <div className="w-full text-center text-[--model-primary]">
                <div className="text-base font-semibold">{firstName}</div>
                {restName && (
                  <div className="-mt-0.5 text-sm font-semibold">
                    {restName}
                  </div>
                )}
                <div className="-mt-1 text-[11px] text-[--model-muted]">
                  {/* Icons are now at the top right */}
                </div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-3 flex w-full items-center justify-center gap-2">
              {hasFileUpload && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(iconWrapperBaseClasses, visionColorClasses)}
                    >
                      <div className={iconOverlayClasses}></div>
                      <EyeIcon
                        className={cn(iconSizeClasses, "relative", visionColorClasses)}
                      />
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
                    <div
                      className={cn(iconWrapperBaseClasses, pdfColorClasses)}
                    >
                      <div className={iconOverlayClasses}></div>
                      <FilePdfIcon
                        className={cn(iconSizeClasses, "relative", pdfColorClasses)}
                      />
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
                      className={cn(
                        iconWrapperBaseClasses,
                        reasoningColorClasses
                      )}
                    >
                      <div className={iconOverlayClasses}></div>
                      <BrainIcon
                        className={cn(
                          iconSizeClasses,
                          "relative",
                          reasoningColorClasses
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Supports reasoning capabilities</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {hasToolCalling && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        iconWrapperBaseClasses,
                        toolCallingColorClasses
                      )}
                    >
                      <div className={iconOverlayClasses}></div>
                      <Wrench
                        className={cn(
                          iconSizeClasses,
                          "relative",
                          toolCallingColorClasses
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Supports tool calling (web search & connectors)</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {hasImageGeneration && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        iconWrapperBaseClasses,
                        imageGenerationColorClasses
                      )}
                    >
                      <div className={iconOverlayClasses}></div>
                      <ImagePlus
                        className={cn(
                          iconSizeClasses,
                          "relative",
                          imageGenerationColorClasses
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Can generate images</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </button>
        </TooltipTrigger>
        {tooltipContentParts.length > 0 && (
          <TooltipContent side="top">{tooltipDisplay}</TooltipContent>
        )}
      </Tooltip>

      {/* Pin/Unpin button on hover */}
      <div className="absolute -right-1.5 -top-1.5 left-auto z-50 flex w-auto translate-y-2 scale-95 items-center rounded-[10px] border border-chat-border/40 bg-card p-1 text-xs text-muted-foreground opacity-0 transition-all group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "cursor-pointer rounded-md bg-accent/30 p-1.5 hover:bg-muted/50",
                isFavorite && isLastFavorite && "cursor-not-allowed opacity-50"
              )}
              tabIndex={-1}
              onClick={handleToggleFavorite}
              disabled={isFavorite && isLastFavorite}
              aria-label={isFavorite ? "Unpin model" : "Pin model"}
            >
              {isFavorite ? (
                <PinOff className="size-4" />
              ) : (
                <Pin className="size-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>
              {isFavorite && isLastFavorite
                ? "Must keep at least one favorite model"
                : isFavorite
                  ? "Unpin model"
                  : "Pin model"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
})

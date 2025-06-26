"use client"

import { Loader } from "@/components/prompt-kit/loader"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import { cn } from "@/lib/utils"
import { MessageMetadata } from "@/lib/ai-sdk-utils"
import { Message as MessageType } from "@ai-sdk/react"
import type {
  ReasoningUIPart,
  SourceUIPart,
  ToolInvocationUIPart,
} from "@ai-sdk/ui-utils"
import {
  ArrowClockwise,
  CaretDown,
  CaretUp,
  Check,
  Copy,
  GitBranch,
  SpinnerGap,
} from "@phosphor-icons/react"
import { AnimatePresence, motion } from "framer-motion"
import dynamic from "next/dynamic"// Client component – required when using React hooks in the app router

import { memo, useEffect, useRef, useState } from "react" // Import React to access memo
import { SourcesList } from "./SourcesList"

interface Source {
  id: string
  url: string
  title: string
  sourceType: "url"
}

type MessageAssistantProps = {
  children: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboard?: () => void
  onReload?: () => void
  onBranch?: () => void
  model?: string
  parts?: MessageType["parts"]
  attachments?: MessageType["experimental_attachments"]
  status?: "streaming" | "ready" | "submitted" | "error"
  reasoning_text?: string
  id: string
  metadata?: MessageMetadata
} 

const Markdown = dynamic(
  () => import("@/components/prompt-kit/markdown").then((mod) => mod.Markdown),
  { ssr: false }
)

function MessageAssistantInner({
  children,
  isLast,
  hasScrollAnchor,
  copied,
  copyToClipboard,
  onReload,
  onBranch,
  model,
  parts,
  attachments,
  status,
  reasoning_text,
  id,
  metadata,
}: MessageAssistantProps) {
  const [showReasoning, setShowReasoning] = useState(status === "streaming") // Collapsed by default, open if streaming
  const prevStatusRef = useRef(status) // Ref to track previous status
  const [isTouch, setIsTouch] = useState(false)

  // Extract model from metadata or use direct model prop as fallback
  const modelFromMetadata = metadata?.modelName || metadata?.modelId
  const displayModel = modelFromMetadata || model
  const reasoningEffort = metadata?.reasoningEffort

  // Format the model display with reasoning effort if available
  const formatModelDisplay = (model: string, effort?: string) => {
    if (!effort || effort === "none") return model
    return `${model} (${effort})`
  }

  // Add logging to debug model and metadata
  // useEffect(() => {
  //   console.log('MessageAssistant - Model prop:', model)
  //   console.log('MessageAssistant - Metadata:', metadata)
  //   console.log('MessageAssistant - Model from metadata:', modelFromMetadata)
  //   console.log('MessageAssistant - Display model:', displayModel)
  //   console.log('MessageAssistant - Reasoning effort:', reasoningEffort)
  // }, [model, metadata, modelFromMetadata, displayModel, reasoningEffort])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0)
    }
  }, [])

  // Effect to auto-collapse reasoning when streaming finishes
  useEffect(() => {
    if (prevStatusRef.current === "streaming" && status !== "streaming") {
      setShowReasoning(false)
    }
    // Update previous status ref
    prevStatusRef.current = status
  }, [status])

  // Prefer `parts` prop, but fall back to `attachments` if `parts` is undefined.
  const combinedParts = (parts ?? attachments) as
    | MessageType["parts"]
    | undefined

  // Extract reasoning parts for streaming display
  const reasoningParts: ReasoningUIPart[] = combinedParts
    ? combinedParts.filter(
      (part): part is ReasoningUIPart => part.type === "reasoning"
    )
    : []

  // Extract sources from source parts
  const sourcesFromParts: Source[] = combinedParts
    ? combinedParts
      .filter((part): part is SourceUIPart => part.type === "source")
      .map((part) => part.source as Source)
    : []

  // Extract sources from tool-invocation results (handles search tools)
  const sourcesFromToolInvocations: Source[] = combinedParts
    ? combinedParts
      .filter(
        (part): part is ToolInvocationUIPart =>
          part.type === "tool-invocation"
      )
      .flatMap((part) => {
        const inv = part.toolInvocation as {
          toolName?: string
          toolCallId?: string
          result?: unknown
        }
        
        // New unified search tool
        if (inv.toolName === "search" && inv.result && typeof inv.result === "object" && inv.result !== null) {
          const searchResult = inv.result as { success?: boolean; results?: Array<{ url?: string; title?: string }> }
          if (searchResult.success && Array.isArray(searchResult.results)) {
            return searchResult.results
              .filter((item) => item && item.url && item.title)
              .map((item, idx: number) => ({
                id: inv.toolCallId ? `${inv.toolCallId}-${idx}` : `search-${idx}`,
                url: item.url!,
                title: item.title!,
                sourceType: "url" as const,
              }))
          }
        }
        
        // Legacy duckDuckGo: result is array
        if (inv.toolName === "duckDuckGo" && Array.isArray(inv.result)) {
          return (
            inv.result as Array<{
              id?: string
              url?: string
              title?: string
            }>
          )
            .filter((item) => item && item.url && item.title)
            .map((item, idx: number) => ({
              id: item.id ?? (inv.toolCallId ? `${inv.toolCallId}-${idx}` : `tmp-${idx}`),
              url: item.url ?? "",
              title: item.title ?? "",
              sourceType: "url" as const,
            }))
        }
        // Legacy exaSearch: result is object with results array
        if (
          inv.toolName === "exaSearch" &&
          inv.result &&
          typeof inv.result === "object" &&
          inv.result !== null &&
          "results" in inv.result &&
          Array.isArray((inv.result as { results: unknown }).results)
        ) {
          const results = (
            inv.result as {
              results: Array<{
                id?: string
                url?: string
                title?: string
              }>
            }
          ).results
          return results
            .filter((item) => item && item.url && item.title)
            .map((item, idx: number) => ({
              id: item.id ?? `${inv.toolCallId}-exa-${idx}`,
              url: item.url!,
              title: item.title!,
              sourceType: "url" as const,
            }))
        }
        return []
      })
    : []

  const sources = [...sourcesFromParts, ...sourcesFromToolInvocations]

  // Show 'thinking...' spinner if any tool-invocation is in progress
  const toolInvocationsInProgress = combinedParts
    ? combinedParts.filter(
      (part): part is ToolInvocationUIPart =>
        part.type === "tool-invocation" &&
        part.toolInvocation.state !== "result"
    )
    : []
  const isSearching = toolInvocationsInProgress.length > 0

  // console.log("Sources:", sources);

  // Before rendering, combine reasoning parts into a single markdown string to avoid odd spacing between streaming chunks
  const combinedReasoningMarkdown =
    reasoningParts.length > 0
      ? reasoningParts.map((p) => p.reasoning).join("")
      : (reasoning_text ?? "")

  return (
    <Message
      id={id}
      className={cn(
        "group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor"
      )}
    >
      <div className={cn("flex w-full flex-col gap-2", isLast && "pb-8")}>
        {(reasoningParts.length > 0 || reasoning_text) && (
          <div className="mb-2 w-full">
            {/* Reasoning Header - Updated UI */}
            {status === "streaming" ? (
              // Display when reasoning is actively streaming
              <div className="flex flex-row items-center gap-2">
                <div className="text-muted-foreground text-sm font-medium">
                  Reasoning
                </div>
                <div className="animate-spin">
                  <SpinnerGap size={14} weight="bold" />{" "}
                  {/* Using existing icon */}
                </div>
              </div>
            ) : (
              // Display when reasoning is finished
              <div className="flex flex-row items-center gap-2">
                <div className="text-muted-foreground text-sm font-medium">
                  Reasoned for a few seconds
                </div>
                <button
                  className={cn(
                    "cursor-pointer rounded-full p-1 transition hover:bg-zinc-200 dark:hover:bg-zinc-800", // Starter template styling
                    showReasoning && "bg-zinc-200 dark:bg-zinc-800" // Apply active background if expanded
                  )}
                  onClick={() => setShowReasoning((v) => !v)}
                  type="button"
                  aria-label={
                    showReasoning ? "Hide Reasoning" : "Show Reasoning"
                  }
                >
                  {showReasoning ? (
                    <CaretUp size={16} weight="bold" /> // Using existing icon
                  ) : (
                    <CaretDown size={16} weight="bold" /> // Using existing icon
                  )}
                </button>
              </div>
            )}
            <AnimatePresence initial={false}>
              {showReasoning && (
                <motion.div
                  key="reasoning"
                  className="flex flex-col w-full gap-4 border-l border-zinc-300 pl-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                  initial={{
                    opacity: 0,
                    marginTop: 0,
                    marginBottom: 0,
                    height: 0,
                  }}
                  animate={{
                    opacity: 1,
                    marginTop: "1rem",
                    marginBottom: 0,
                    height: "auto",
                  }}
                  exit={{
                    opacity: 0,
                    marginTop: 0,
                    marginBottom: 0,
                    height: 0,
                  }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  {combinedReasoningMarkdown && (
                    <Markdown className="prose prose-sm dark:prose-invert leading-relaxed break-words w-full max-w-none">
                      {combinedReasoningMarkdown}
                    </Markdown>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* Show 'thinking...' spinner if tool call in progress */}
        {isSearching && (
          <div className="text-muted-foreground my-2 flex items-center gap-2 text-sm">
            <Loader text="Searching the web" />
          </div>
        )}

        <MessageContent
          className="prose dark:prose-invert relative min-w-full bg-transparent p-0"
          markdown={true}
        >
          {children}
        </MessageContent>

        {/* Perplexity-style sources list */}
        {sources.length > 0 && <SourcesList sources={sources} />}

        <MessageActions
          className={cn(
            "flex gap-0 transition-opacity",
            isTouch
              ? "opacity-100"
              : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
          )}
        >
          <MessageAction
            tooltip={copied ? "Copied!" : "Copy text"}
            side="bottom"
            delayDuration={0}
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Copy text"
              onClick={copyToClipboard}
              type="button"
              disabled={status === "streaming"}
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </MessageAction>
          <MessageAction
            tooltip="Create a new chat starting from here"
            side="bottom"
            delayDuration={0}
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Branch chat"
              onClick={onBranch}
              type="button"
              disabled={status === "streaming"}
            >
              <GitBranch className="size-4" />
            </button>
          </MessageAction>
          <MessageAction tooltip="Regenerate" side="bottom" delayDuration={0}>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Regenerate"
              onClick={onReload}
              type="button"
              disabled={status === "streaming"}
            >
              <ArrowClockwise className="size-4" />
            </button>
          </MessageAction>
          {displayModel && (
            <span className="text-muted-foreground ml-2 text-xs inline-block">
              {`${formatModelDisplay(displayModel, reasoningEffort)}`}
            </span>
          )}
        </MessageActions>
      </div>
    </Message>
  )
}

// Default shallow comparison is fine – re-render will happen whenever
// `parts`, `attachments`, `status`, or any primitive prop reference changes
// which is what we want during streaming.
export const MessageAssistant = memo(MessageAssistantInner)

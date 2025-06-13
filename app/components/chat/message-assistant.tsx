import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import { cn } from "@/lib/utils"
import { ArrowClockwise, Check, Copy, CaretDown, CaretUp, SpinnerGap } from "@phosphor-icons/react"
import { Loader } from "@/components/prompt-kit/loader"

import { Message as MessageType } from "@ai-sdk/react"
import { SourcesList } from "./SourcesList"
import type { SourceUIPart } from "@ai-sdk/ui-utils"

type MessageAssistantProps = {
  children: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboard?: () => void
  onReload?: () => void
  model?: string
  parts?: MessageType["parts"]
  status?: "streaming" | "idle" | "submitted" | "error"
  reasoning_text?: string // NEW: reasoning_text from Supabase/IndexedDB
}

import { useState, useEffect, useRef } from "react" // Import useEffect and useRef
import { AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"

const Markdown = dynamic(
  () => import("@/components/prompt-kit/markdown").then((mod) => mod.Markdown),
  { ssr: false }
)

import type { ReasoningUIPart, ToolInvocationUIPart } from "@ai-sdk/ui-utils"

const MotionDiv = (typeof window !== "undefined" && (require("framer-motion").motion.create
  ? require("framer-motion").motion.create("div")
  : require("framer-motion").motion.div)) as typeof import("framer-motion").motion.div



export function MessageAssistant({
  children,
  isLast,
  hasScrollAnchor,
  copied,
  copyToClipboard,
  onReload,
  model,
  parts,
  status,
  reasoning_text,
}: MessageAssistantProps) {
  const [showReasoning, setShowReasoning] = useState(status === "streaming") // Collapsed by default, open if streaming
  const prevStatusRef = useRef(status); // Ref to track previous status
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  // Effect to auto-collapse reasoning when streaming finishes
  useEffect(() => {
    if (prevStatusRef.current === "streaming" && status !== "streaming") {
      setShowReasoning(false);
    }
    // Update previous status ref
    prevStatusRef.current = status;
  }, [status]);

  // Extract reasoning parts for streaming display
  const reasoningParts: ReasoningUIPart[] = parts
    ? parts.filter((part): part is ReasoningUIPart => part.type === "reasoning")
    : []

  // Extract sources from source parts
  const sourcesFromParts: SourceUIPart["source"][] = parts
    ? parts.filter((part): part is SourceUIPart => part.type === "source").map((part) => part.source)
    : [];

  // Extract sources from tool-invocation results (handles duckDuckGo and exaSearch)
  const sourcesFromToolInvocations: SourceUIPart["source"][] = parts
    ? parts
        .filter((part): part is ToolInvocationUIPart => part.type === "tool-invocation")
        .flatMap((part) => {
          const inv = part.toolInvocation as any;
          // duckDuckGo: result is array
          if (inv.toolName === "duckDuckGo" && Array.isArray(inv.result)) {
            return inv.result
              .filter((item: any) => item && item.url && item.title)
              .map((item: any, idx: number) => ({
                id: item.id ?? `${inv.toolCallId}-${idx}`,
                url: item.url,
                title: item.title,
              }));
          }
          // exaSearch: result is object with results array
          if (inv.toolName === "exaSearch" && inv.result && Array.isArray(inv.result.results)) {
            return inv.result.results
              .filter((item: any) => item && item.url && item.title)
              .map((item: any, idx: number) => ({
                id: item.id ?? `${inv.toolCallId}-exa-${idx}`,
                url: item.url,
                title: item.title,
              }));
          }
          return [];
        })
    : [];

  const sources = [...sourcesFromParts, ...sourcesFromToolInvocations];

  // Show 'thinking...' spinner if any tool-invocation is in progress
  const toolInvocationsInProgress = parts
    ? parts.filter(
        (part): part is ToolInvocationUIPart =>
          part.type === "tool-invocation" && part.toolInvocation.state !== "result"
      )
    : [];
  const isSearching = toolInvocationsInProgress.length > 0;

  // console.log("Sources:", sources);

  // Before rendering, combine reasoning parts into a single markdown string to avoid odd spacing between streaming chunks
  const combinedReasoningMarkdown = reasoningParts.length > 0
    ? reasoningParts.map((p) => p.reasoning).join("")
    : reasoning_text ?? "";

  return (
    <Message
      className={cn(
        "group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor"
      )}
    >
      <div className={cn("flex min-w-full flex-col gap-2", isLast && "pb-8")}>
        {(reasoningParts.length > 0 || reasoning_text) && (
          <div className="mb-2">
            {/* Reasoning Header - Updated UI */}
            {status === "streaming" ? (
              // Display when reasoning is actively streaming
              <div className="flex flex-row gap-2 items-center">
                <div className="font-medium text-sm text-muted-foreground">Reasoning</div>
                <div className="animate-spin">
                   <SpinnerGap size={14} weight="bold" /> {/* Using existing icon */}
                </div>
              </div>
            ) : (
              // Display when reasoning is finished
              <div className="flex flex-row gap-2 items-center">
                <div className="font-medium text-sm text-muted-foreground">Reasoned for a few seconds</div>
                <button
                  className={cn(
                    "cursor-pointer rounded-full p-1 transition dark:hover:bg-zinc-800 hover:bg-zinc-200", // Starter template styling
                    showReasoning && "dark:bg-zinc-800 bg-zinc-200" // Apply active background if expanded
                  )}
                  onClick={() => setShowReasoning((v) => !v)}
                  type="button"
                  aria-label={showReasoning ? "Hide Reasoning" : "Show Reasoning"}
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
                <MotionDiv
                  key="reasoning"
                  className="text-sm dark:text-zinc-400 text-zinc-600 flex flex-col gap-4 border-l pl-3 dark:border-zinc-800 border-zinc-300" // Added border and padding like starter
                  initial={{ opacity: 0, marginTop: 0, marginBottom: 0, height: 0 }}
                  animate={{ opacity: 1, marginTop: "1rem", marginBottom: 0, height: "auto" }} // Adjusted margin like starter
                  exit={{ opacity: 0, marginTop: 0, marginBottom: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  // layout // Removed layout prop to prevent bouncing during streaming
                >
                  {combinedReasoningMarkdown && (
                    <Markdown className="prose prose-sm dark:prose-invert leading-relaxed break-words">
                      {combinedReasoningMarkdown}
                    </Markdown>
                  )}
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* Show 'thinking...' spinner if tool call in progress */}
        {isSearching && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm my-2">
            <Loader text="Searching the web"/>
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
          {model && (
            <span className="hidden md:inline-block ml-2 text-xs text-muted-foreground">
              {`Generated with ${model}`}
            </span>
          )}
        </MessageActions>
      </div>
    </Message>
  )
}

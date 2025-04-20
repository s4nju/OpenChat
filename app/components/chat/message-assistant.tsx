import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import { cn } from "@/lib/utils"
import { ArrowClockwise, Check, Copy, CaretDown, CaretUp, SpinnerGap } from "@phosphor-icons/react"

import { Message as MessageType } from "@ai-sdk/react"

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
import { AnimatePresence, motion } from "framer-motion"
import dynamic from "next/dynamic"

const Markdown = dynamic(
  () => import("@/components/prompt-kit/markdown").then((mod) => mod.Markdown),
  { ssr: false }
)

import type { ReasoningUIPart } from "@ai-sdk/ui-utils"

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

  // If no explicit reasoning, try to extract from <think> tag in children
  let parsedReasoning: string | null = null;
  let parsedChildren = children;
  if (!reasoning_text && reasoningParts.length === 0 && typeof children === 'string') {
    const thinkOpenIdx = children.indexOf('<think>');
    const thinkCloseIdx = children.indexOf('</think>');
    if (thinkOpenIdx !== -1) {
      if (thinkCloseIdx !== -1) {
        // Both open and close tag present: normal extraction
        const thinkMatch = children.match(/<think>([\s\S]*?)<\/think>/i);
        if (thinkMatch) {
          parsedReasoning = thinkMatch[1].trim();
          parsedChildren = children.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
        }
      } else {
        // Only open tag present (streaming): show everything after <think> in reasoning, nothing in main
        parsedReasoning = children.slice(thinkOpenIdx + 7).trim();
        parsedChildren = '';
      }
    }
  }

  return (
    <Message
      className={cn(
        "group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor"
      )}
    >
      <div className={cn("flex min-w-full flex-col gap-2", isLast && "pb-8")}>
        {(reasoningParts.length > 0 || reasoning_text || parsedReasoning) && (
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
                  {reasoningParts.length > 0
                    ? reasoningParts.map((part: ReasoningUIPart, idx: number) => (
                        <Markdown
                          key={idx}
                          className="!text-xs !p-0 !bg-transparent font-mono"
                        >
                          {part.reasoning}
                        </Markdown>
                      ))
                    : reasoning_text
                      ? <Markdown className="!text-sm !p-0 !bg-transparent font-mono">{reasoning_text}</Markdown>
                      : parsedReasoning
                        ? <Markdown className="!text-sm !p-0 !bg-transparent font-mono">{parsedReasoning}</Markdown>
                        : null}
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        )}
        <MessageContent
          className="prose dark:prose-invert relative min-w-full bg-transparent p-0"
          markdown={true}
        >
          {parsedChildren}
        </MessageContent>

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

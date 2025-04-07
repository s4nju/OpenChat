import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/prompt-kit/reasoning"
import { cn } from "@/lib/utils"
import { Message as MessageType } from "@ai-sdk/react" // Import MessageType only
import { ArrowClockwise, Brain, Check, Copy, Trash } from "@phosphor-icons/react"
import { useEffect, useState, useMemo } from "react" // Import useMemo

type MessageAssistantProps = {
  children: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboard?: () => void
  onReload?: (id: string) => void // Expect ID
  onDelete?: (id: string) => void
  id?: string
  isStreaming?: boolean
  storedReasoning?: string
  parts?: Array<{
    type: string
    text?: string
    details?: Array<{
      type: string
      text?: string
    }>
  }>
  annotations?: MessageType["annotations"] // Add annotations prop
}

export function MessageAssistant({
  children,
  isLast,
  hasScrollAnchor,
  copied,
  copyToClipboard,
  onReload,
  onDelete,
  id,
  isStreaming = false,
  storedReasoning,
  parts,
  annotations, // Destructure annotations
}: MessageAssistantProps) {
  // State to control reasoning open/closed state - default to closed
  const [isReasoningOpen, setIsReasoningOpen] = useState(false)
  const [hasStreamingCompleted, setHasStreamingCompleted] = useState(false)
  // State to store reasoning accumulated from annotations
  const [accumulatedAnnotationReasoning, setAccumulatedAnnotationReasoning] = useState("");

  // Effect to reset accumulated reasoning when the message ID changes
  useEffect(() => {
    setAccumulatedAnnotationReasoning("");
    // Also reset open state when ID changes (for navigating between chats)
    setIsReasoningOpen(false);
    setHasStreamingCompleted(false);
  }, [id]);

  // Effect to open reasoning when streaming starts
  useEffect(() => {
    if (isStreaming) {
      setIsReasoningOpen(true);
      setHasStreamingCompleted(false); // Reset completion flag when streaming starts
    }
  }, [isStreaming]);

  // Effect to accumulate reasoning from annotations
  useEffect(() => {
    if (annotations) {
      const reasoningContent = annotations
        .filter(
          (anno): anno is { type: 'reasoning_chunk'; content: string } =>
            typeof anno === 'object' &&
            anno !== null &&
            'type' in anno &&
            anno.type === 'reasoning_chunk' &&
            'content' in anno &&
            typeof anno.content === 'string'
        )
        .map(anno => anno.content)
        .join("");
      setAccumulatedAnnotationReasoning(reasoningContent);
    }
  }, [annotations]); // Rerun when annotations update

  // Extract reasoning content from parts
  const reasoningParts = parts?.filter(part => part.type === 'reasoning') || []
  const hasReasoningParts = reasoningParts.length > 0
  
  // Combine reasoning text from details or use stored reasoning
  const reasoningFromParts = hasReasoningParts 
    ? reasoningParts
        .map(part => 
          part.details
            ?.filter(detail => detail.type === 'text')
            .map(detail => detail.text)
            .join("")
        )
        .join("\n\n")
    : ""

  // Remove the useMemo calculation for liveReasoningFromAnnotations

  // Determine the final reasoning text (from stored or parts)
  const finalReasoningText = storedReasoning || reasoningFromParts

  // Determine the text to display:
  // Prioritize final text if available.
  // Otherwise, show the reasoning accumulated from annotations.
  const displayReasoningText = finalReasoningText || accumulatedAnnotationReasoning || ""

  // Determine if the reasoning section should be shown at all
  const hasAnyReasoning = !!displayReasoningText

  // Track streaming completion (remains the same, based on props)
  useEffect(() => {
    // Use hasAnyReasoning here
    if (hasAnyReasoning && !isStreaming && isLast && !hasStreamingCompleted) {
      setHasStreamingCompleted(true)
    }
  }, [hasAnyReasoning, isStreaming, isLast, hasStreamingCompleted])

  // Auto-collapse reasoning only after streaming completes
  useEffect(() => {
    // Use hasAnyReasoning here
    if (hasAnyReasoning && hasStreamingCompleted) {
      const timer = setTimeout(() => {
        setIsReasoningOpen(false)
      }, 100) // Collapse 1 second after streaming completes

      return () => clearTimeout(timer)
    }
  }, [hasAnyReasoning, hasStreamingCompleted])

  const handleDelete = () => {
    if (onDelete && id) {
      onDelete(id)
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
        {/* Render Reasoning if live or final reasoning exists */}
        {hasAnyReasoning && (
          <Reasoning className="mt-2 mb-3" open={isReasoningOpen} onOpenChange={setIsReasoningOpen}>
            <ReasoningTrigger className="text-xs text-muted-foreground hover:text-foreground">
              <div className="flex items-center gap-2">
                <Brain className="size-4" />
                <span>Show reasoning</span>
              </div>
            </ReasoningTrigger>
            <ReasoningContent className="mt-2 text-xm">
              {/* Display live or final reasoning */}
              {displayReasoningText}
            </ReasoningContent>
          </Reasoning>
        )}

        <MessageContent
          className="prose dark:prose-invert relative min-w-full bg-transparent p-0"
          markdown={true}
        >
          {children}
        </MessageContent>

        <MessageActions
          className={cn(
            "flex gap-0 md:opacity-0 transition-opacity md:group-hover:opacity-100"
          )}
        >
          <MessageAction
            tooltip={copied ? "Copied!" : "Copy text"}
            side="bottom"
            delayDuration={0}
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
              aria-label="Copy text"
              onClick={copyToClipboard}
              type="button"
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
              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
              aria-label="Regenerate"
              onClick={() => onReload && id && onReload(id)} // Pass ID if available
              type="button"
              disabled={!onReload || !id} // Disable if no handler or ID
            >
              <ArrowClockwise className="size-4" />
            </button>
          </MessageAction>
          {onDelete && (
            <MessageAction tooltip="Delete" side="bottom" delayDuration={0}>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
                aria-label="Delete"
                onClick={handleDelete}
                type="button"
              >
                <Trash className="size-4" />
              </button>
            </MessageAction>
          )}
        </MessageActions>
      </div>
    </Message>
  )
}

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
import { ArrowClockwise, Brain, Check, Copy, Trash } from "@phosphor-icons/react"
import { useEffect, useState } from "react"

type MessageAssistantProps = {
  children: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboard?: () => void
  onReload?: () => void
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
}: MessageAssistantProps) {
  // State to control reasoning open/closed state
  const [isReasoningOpen, setIsReasoningOpen] = useState(true)
  const [hasStreamingCompleted, setHasStreamingCompleted] = useState(false)
  
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
  
  // Use stored reasoning if available, otherwise use reasoning from parts
  const reasoningText = storedReasoning || reasoningFromParts
  const hasReasoning = !!reasoningText
  
  // Track streaming completion
  useEffect(() => {
    if (hasReasoning && !isStreaming && isLast && !hasStreamingCompleted) {
      setHasStreamingCompleted(true)
    }
  }, [hasReasoning, isStreaming, isLast, hasStreamingCompleted])
        
  // Auto-collapse reasoning only after streaming completes
  useEffect(() => {
    if (hasReasoning && hasStreamingCompleted) {
      const timer = setTimeout(() => {
        setIsReasoningOpen(false)
      }, 100) // Collapse 1 second after streaming completes
      
      return () => clearTimeout(timer)
    }
  }, [hasReasoning, hasStreamingCompleted])

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
        {hasReasoning && (
          <Reasoning className="mt-2 mb-3" open={isReasoningOpen} onOpenChange={setIsReasoningOpen}>
            <ReasoningTrigger className="text-xs text-muted-foreground hover:text-foreground">
              <div className="flex items-center gap-2">
                <Brain className="size-4" />
                <span>Show reasoning</span>
              </div>
            </ReasoningTrigger>
            <ReasoningContent className="mt-2 text-xm">
              {reasoningText}
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
            "flex gap-0 opacity-0 transition-opacity group-hover:opacity-100"
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
              onClick={onReload}
              type="button"
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

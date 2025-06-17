import { ScrollButton } from "@/components/motion-primitives/scroll-button"
import { ChatContainer } from "@/components/prompt-kit/chat-container"
import { Loader } from "@/components/prompt-kit/loader"
import { Message as MessageType } from "@ai-sdk/react"
import React, { useRef } from "react"
import { Message } from "./message"

type MessageWithReasoning = MessageType & {
  reasoning_text?: string
  model?: string
}

type ConversationProps = {
  messages: MessageWithReasoning[]
  status?: "streaming" | "ready" | "submitted" | "error"
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: (id: string) => void
  onBranch: (messageId: string) => void
}

const Conversation = React.memo(function Conversation({
  messages,
  status = "ready",
  onDelete,
  onEdit,
  onReload,
  onBranch,
}: ConversationProps) {
  const initialMessageCount = useRef(messages.length)
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  if (!messages || messages.length === 0)
    return <div className="h-full w-full"></div>

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto">
      <ChatContainer
        className="relative flex w-full flex-col items-center pt-20 pb-4"
        autoScroll={true}
        ref={containerRef}
        scrollToRef={scrollRef}
        style={{
          scrollbarGutter: "stable both-edges",
        }}
      >
        {messages?.map((message, index) => {
          const isLast = index === messages.length - 1 && status !== "submitted"
          const hasScrollAnchor =
            isLast && messages.length > initialMessageCount.current

          return (
            <Message
              key={message.id}
              id={message.id}
              variant={message.role}
              attachments={message.experimental_attachments}
              isLast={isLast}
              onDelete={onDelete}
              onEdit={onEdit}
              onReload={() => onReload(message.id)}
              onBranch={() => onBranch(message.id)}
              hasScrollAnchor={hasScrollAnchor}
              parts={message.parts}
              status={status}
              reasoning_text={message.reasoning_text}
              model={message.model}
            >
              {message.content}
            </Message>
          )
        })}
        {status === "submitted" &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="group min-h-scroll-anchor flex w-full max-w-3xl flex-col items-start gap-2 px-6 pb-2">
              <Loader variant="dots" size="md" />
            </div>
          )}
      </ChatContainer>
      <div className="absolute bottom-0 w-full max-w-3xl">
        <ScrollButton
          className="absolute top-[-50px] right-[30px]"
          scrollRef={scrollRef}
          containerRef={containerRef}
        />
      </div>
    </div>
  )
})

export { Conversation }

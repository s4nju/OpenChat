import { ScrollButton } from "@/components/motion-primitives/scroll-button"
import { ChatContainer } from "@/components/prompt-kit/chat-container"
import { Loader } from "@/components/prompt-kit/loader"
import { Message as MessageType } from "@ai-sdk/react"
import { useRef } from "react"
import { Message } from "./message"

type ConversationProps = {
  messages: MessageType[]
  status?: "streaming" | "ready" | "submitted" | "error"
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: (id: string) => void // Expect ID
  isUserAuthenticated: boolean // Add this line
  // Remove liveReasoning prop
}

export function Conversation({
  messages,
  status = "ready",
  onDelete,
  onEdit,
  onReload,
  isUserAuthenticated, // Add this line
  // Remove liveReasoning
}: ConversationProps) {
  const initialMessageCount = useRef(messages.length)
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isStreaming = status === "streaming"

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
              parts={message.parts}
              storedReasoning={(message as any).storedReasoning}
              isLast={isLast}
              isStreaming={isLast && isStreaming}
              onDelete={onDelete}
              onEdit={onEdit}
              onReload={onReload}
              hasScrollAnchor={hasScrollAnchor}
              annotations={message.annotations} // Pass annotations instead
              isUserAuthenticated={isUserAuthenticated} // Add this line
            >
              {message.content}
            </Message>
          )
        })}
        {status === "submitted" &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="group min-h-scroll-anchor flex w-full max-w-3xl flex-col items-start gap-2 px-6 pb-2">
              <Loader />
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
}

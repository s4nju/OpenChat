import { Message as MessageType } from "@ai-sdk/react"
import React, { useState } from "react"
import { MessageMetadata } from "@/lib/ai-sdk-utils"
import { MessageAssistant } from "./message-assistant"
import { MessageUser } from "./message-user"

export type MessageProps = {
  variant: MessageType["role"]
  model?: string
  children: string
  id: string
  attachments?: MessageType["experimental_attachments"]
  isLast?: boolean
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  onBranch: () => void
  hasScrollAnchor?: boolean
  parts?: MessageType["parts"]
  status?: "streaming" | "ready" | "submitted" | "error" // Add status prop
  reasoning_text?: string
  metadata?: MessageMetadata
}

function MessageComponent({
  variant,
  model,
  children,
  id,
  attachments,
  isLast,
  onDelete,
  onEdit,
  onReload,
  onBranch,
  hasScrollAnchor,
  parts,
  status, // Receive status prop
  reasoning_text,
  metadata,
}: MessageProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 500)
  }

  if (variant === "user") {
    return (
      <MessageUser
        copied={copied}
        copyToClipboard={copyToClipboard}
        onReload={onReload}
        onEdit={onEdit}
        onDelete={onDelete}
        id={id}
        hasScrollAnchor={hasScrollAnchor}
        attachments={attachments}
        status={status}
      >
        {children}
      </MessageUser>
    )
  }

  if (variant === "assistant") {
    return (
      <MessageAssistant
        id={id}
        model={model}
        copied={copied}
        copyToClipboard={copyToClipboard}
        onReload={onReload}
        onBranch={onBranch}
        isLast={isLast}
        hasScrollAnchor={hasScrollAnchor}
        parts={parts}
        attachments={attachments}
        status={status}
        reasoning_text={reasoning_text}
        metadata={metadata}
      >
        {children}
      </MessageAssistant>
    )
  }

  return null
}

export const Message = React.memo(MessageComponent)
Message.displayName = 'Message'

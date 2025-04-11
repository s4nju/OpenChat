import { Message as MessageType } from "@ai-sdk/react"
import React, { useState } from "react"
import { MessageAssistant } from "./message-assistant"
import { MessageUser } from "./message-user"

export type MessageProps = {
  variant: MessageType["role"]
  children: string
  id: string
  attachments?: MessageType["experimental_attachments"]
  isLast?: boolean
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  hasScrollAnchor?: boolean
  parts?: MessageType["parts"]
  status?: "streaming" | "idle" | "submitted" | "error" // Add status prop
  reasoning_text?: string
}

export function Message({
  variant,
  children,
  id,
  attachments,
  isLast,
  onDelete,
  onEdit,
  onReload,
  hasScrollAnchor,
  parts,
  status, // Receive status prop
  reasoning_text,
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
        children={children}
        copied={copied}
        copyToClipboard={copyToClipboard}
        onReload={onReload}
        onEdit={onEdit}
        onDelete={onDelete}
        id={id}
        hasScrollAnchor={hasScrollAnchor}
        attachments={attachments}
      />
    )
  }

  if (variant === "assistant") {
      return (
        <MessageAssistant
          children={children}
          copied={copied}
          copyToClipboard={copyToClipboard}
          onReload={onReload}
          isLast={isLast}
          hasScrollAnchor={hasScrollAnchor}
          parts={parts}
          status={isLast ? status : undefined} // Pass status only if it's the last message
          reasoning_text={reasoning_text}
        />
      )
    }

  return null
}

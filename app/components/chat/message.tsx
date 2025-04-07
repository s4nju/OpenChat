import { Message as MessageType } from "@ai-sdk/react"
import React, { useState } from "react"
import { MessageAssistant } from "./message-assistant"
import { MessageUser } from "./message-user"

type MessageProps = {
  variant: MessageType["role"]
  children: string
  id: string
  attachments?: MessageType["experimental_attachments"]
  parts?: MessageType["parts"]
  storedReasoning?: string
  isLast?: boolean
  isStreaming?: boolean
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: (id: string) => void // Expect ID
  hasScrollAnchor?: boolean
  annotations?: MessageType["annotations"] // Add annotations prop
  isUserAuthenticated: boolean // Add this line
}

export function Message({
  variant,
  children,
  id,
  attachments,
  parts,
  storedReasoning,
  isLast,
  isStreaming,
  onDelete,
  onEdit,
  onReload,
  hasScrollAnchor,
  annotations, // Destructure annotations
  isUserAuthenticated, // Add this line
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
        isUserAuthenticated={isUserAuthenticated} // Add this line
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
        onDelete={onDelete}
        id={id}
        isLast={isLast}
        isStreaming={isStreaming}
        hasScrollAnchor={hasScrollAnchor}
        parts={parts}
        storedReasoning={storedReasoning}
        annotations={annotations} // Pass annotations down
        isUserAuthenticated={isUserAuthenticated} // Add this line
      />
    )
  }

  return null
}

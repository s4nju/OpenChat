"use client"

import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTrigger,
} from "@/components/motion-primitives/morphing-dialog"
import {
  MessageAction,
  MessageActions,
  Message as MessageContainer,
  MessageContent,
} from "@/components/prompt-kit/message"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Message as MessageType } from "@ai-sdk/react"
import { Check, Copy, FilePdf, Trash } from "@phosphor-icons/react"
import React, { useEffect, useRef, useState, memo } from "react"
import Image from 'next/image'

const getTextFromDataUrl = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1]
  return base64
}

export type MessageUserProps = {
  hasScrollAnchor?: boolean
  attachments?: MessageType["experimental_attachments"]
  children: string
  copied: boolean
  copyToClipboard: () => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  onDelete: (id: string) => void
  id: string
  status?: "streaming" | "ready" | "submitted" | "error"
}

function MessageUserInner({
  hasScrollAnchor,
  attachments,
  children,
  copied,
  copyToClipboard,
  onEdit,
  onReload,
  onDelete,
  id,
  status,
}: MessageUserProps): React.ReactElement {
  const [editInput, setEditInput] = useState(children)
  const [isEditing, setIsEditing] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const displayContent = children.replace(/\n{2,}/g, "\n\n")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0)
    }
  }, [])

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditInput(children)
  }

  const handleSave = () => {
    if (onEdit) {
      onEdit(id, editInput)
    }
    onReload()
    setIsEditing(false)
  }

  const handleDelete = () => {
    onDelete(id)
  }

  return (
    <MessageContainer
      id={id}
      className={cn(
        "group flex w-full max-w-3xl flex-col items-end gap-2 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor"
      )}
    >
      {attachments?.map((attachment, index) => (
        <div
          className="flex flex-row gap-2"
          key={`${attachment.name}-${index}`}
        >
          {attachment.contentType?.startsWith("image") ? (
            <MorphingDialog
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 18,
                mass: 0.3,
              }}
            >
              <MorphingDialogTrigger className="z-10">
                <Image
                  className="mb-1 rounded-md"
                  key={attachment.name}
                  src={attachment.url}
                  alt={attachment.name ?? ''}
                  width={160}
                  height={160}
                />
              </MorphingDialogTrigger>
              <MorphingDialogContainer>
                <MorphingDialogContent className="relative rounded-lg">
                  <MorphingDialogImage
                    src={attachment.url}
                    alt={attachment.name || ""}
                    className="max-h-[90vh] max-w-[90vw] object-contain"
                  />
                </MorphingDialogContent>
                <MorphingDialogClose className="text-primary" />
              </MorphingDialogContainer>
            </MorphingDialog>
          ) : attachment.contentType?.startsWith("text") ? (
            <div className="text-primary mb-3 h-24 w-40 overflow-hidden rounded-md border p-2 text-xs">
              {getTextFromDataUrl(attachment.url)}
            </div>
          ) : attachment.contentType === "application/pdf" ? (
            <a
              href={attachment.url}
              download={attachment.name}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-muted hover:bg-muted/80 focus:bg-muted/70 mb-2 flex w-35 cursor-pointer flex-col justify-between rounded-lg border border-gray-200 px-4 py-2 shadow-sm transition-colors focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:focus:bg-zinc-800"
              style={{ minWidth: 0, minHeight: 64 }}
              role="button"
              tabIndex={0}
              aria-label={`Download PDF: ${attachment.name}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  ; (e.currentTarget as HTMLAnchorElement).click()
                }
              }}
            >
              {/* Placeholder preview lines */}
              <div
                className="mt-1 mb-2 flex flex-1 flex-col gap-0.5"
                aria-hidden="true"
              >
                <div className="h-2 w-4/5 rounded bg-gray-200 dark:bg-zinc-600" />
                <div className="h-2 w-3/5 rounded bg-gray-200 dark:bg-zinc-600" />
                <div className="h-2 w-2/5 rounded bg-gray-200 dark:bg-zinc-600" />
              </div>
              {/* Footer with icon and filename */}
              <div className="flex items-center gap-2">
                <FilePdf
                  size={20}
                  weight="duotone"
                  className="shrink-0 text-gray-500 dark:text-gray-300"
                  aria-hidden="true"
                />
                <span
                  className="truncate overflow-hidden text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-100"
                  style={{ maxWidth: "calc(100% - 28px)" }}
                  title={attachment.name}
                >
                  {attachment.name}
                </span>
              </div>
            </a>
          ) : null}
        </div>
      ))}
      {isEditing ? (
        <div
          className="bg-accent relative flex min-w-[180px] flex-col gap-2 rounded-3xl px-5 py-2.5"
          style={{
            width: contentRef.current?.offsetWidth,
          }}
        >
          <textarea
            className="w-full resize-none bg-transparent outline-none"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSave()
              }
              if (e.key === "Escape") {
                handleEditCancel()
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <MessageContent
          className="bg-accent relative max-w-[70%] rounded-3xl px-5 py-2.5 whitespace-pre-line"
          markdown={false}
          ref={contentRef}
        >
          {displayContent}
        </MessageContent>
      )}
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
            disabled={!!status && status !== "ready"}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </MessageAction>
        {/* @todo: add when ready */}
        {/* <MessageAction
          tooltip={isEditing ? "Save" : "Edit"}
          side="bottom"
          delayDuration={0}
        >
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Edit"
            onClick={() => setIsEditing(!isEditing)}
            type="button"
          >
            <PencilSimple className="size-4" />
          </button>
        </MessageAction> */}
        <MessageAction tooltip="Delete" side="bottom" delayDuration={0}>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Delete"
            onClick={handleDelete}
            type="button"
            disabled={!!status && status !== "ready"}
          >
            <Trash className="size-4" />
          </button>
        </MessageAction>
      </MessageActions>
    </MessageContainer>
  )
}

export const MessageUser = memo(MessageUserInner)

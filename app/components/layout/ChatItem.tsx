"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Id } from "@/convex/_generated/dataModel"
import {
  Check,
  GitBranch,
  PencilSimple,
  PushPinSimple,
  PushPinSimpleSlash,
  TrashSimple,
  X,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import React, { useState } from "react"

// Helper function for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(" ")

interface ChatItemProps {
  id: Id<"chats">
  title: string | undefined
  originalChatId?: Id<"chats">
  parentChatTitle?: string
  handleSaveEdit: (id: Id<"chats">, title: string) => void
  handleConfirmDelete: (id: Id<"chats">) => void
  handleTogglePin: (id: Id<"chats">) => void
  isPinned: boolean
}

export const ChatItem = React.memo(function ChatItem({
  id,
  title,
  originalChatId,
  parentChatTitle,
  handleSaveEdit,
  handleConfirmDelete,
  handleTogglePin,
  isPinned,
}: ChatItemProps) {
  const params = useParams<{ chatId?: string }>()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title || "")
  const [isDeleting, setIsDeleting] = useState(false)

  const onSave = () => {
    handleSaveEdit(id, editedTitle)
    setIsEditing(false)
  }

  const onDelete = () => {
    handleConfirmDelete(id)
    setIsDeleting(false)
  }

  return (
    <li key={id} className="group/menu-item relative">
      {isEditing ? (
        <div className="group/menu-item bg-accent relative flex h-9 items-center rounded-lg px-2 py-0.5">
          <form
            className="flex w-full items-center justify-between"
            onSubmit={(e) => {
              e.preventDefault()
              onSave()
            }}
          >
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="h-8 flex-1 rounded-none border-0 bg-transparent px-1 text-sm shadow-none outline-none focus:ring-0"
              autoFocus
            />
            <div className="ml-2 flex gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-primary size-8 rounded-md p-1.5"
                type="submit"
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive size-8 rounded-md p-1.5"
                onClick={() => setIsEditing(false)}
                type="button"
              >
                <X className="size-4" />
              </Button>
            </div>
          </form>
        </div>
      ) : isDeleting ? (
        <div className="group/menu-item bg-accent text-accent-foreground relative flex h-9 w-full items-center overflow-hidden rounded-lg px-2 py-1 text-sm">
          <div className="flex w-full items-center justify-between">
            <span className="text-destructive text-sm font-medium">
              Delete chat?
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive size-8 rounded-md p-1.5"
                onClick={(e) => {
                  e.preventDefault()
                  onDelete()
                }}
                type="button"
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-primary size-8 rounded-md p-1.5"
                onClick={(e) => {
                  e.preventDefault()
                  setIsDeleting(false)
                }}
                type="button"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Link
          href={`/c/${id}`}
          prefetch
          replace
          scroll={false}
          key={id}
          className={cn(
            "group/link relative flex h-9 w-full items-center overflow-hidden rounded-lg px-2 py-1 text-sm outline-none",
            "hover:bg-accent hover:text-accent-foreground focus-visible:text-accent-foreground",
            "focus-visible:ring-primary focus-visible:ring-2",
            params.chatId === id && "bg-accent text-accent-foreground"
          )}
        >
          <div className="relative flex w-full items-center">
            {originalChatId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      router.push(`/c/${originalChatId}`)
                    }}
                    className="text-muted-foreground/50 hover:text-muted-foreground mr-1"
                  >
                    <GitBranch className="h-4 w-4 rotate-180" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="z-[9999]">
                  Branched From: {parentChatTitle ?? "Parent Chat"}
                </TooltipContent>
              </Tooltip>
            )}
            <div className="relative w-full">
              <span className="hover:truncate-none pointer-events-none block h-full w-full cursor-pointer truncate overflow-hidden rounded bg-transparent px-1 py-1 text-sm outline-none">
                {title}
              </span>
            </div>
          </div>
          <div className="text-muted-foreground group-hover/link:bg-accent dark:group-hover/link:bg-muted pointer-events-auto absolute top-0 -right-0.25 bottom-0 z-10 flex translate-x-full items-center justify-end transition-transform duration-200 group-hover/link:translate-x-0">
            <div className="from-accent dark:from-muted pointer-events-none absolute top-0 right-[100%] bottom-0 h-12 w-8 bg-gradient-to-l to-transparent opacity-0 transition-opacity duration-200 group-hover/link:opacity-100"></div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground rounded-md p-1.5 hover:bg-orange-500/20 hover:text-orange-600 dark:hover:text-orange-400"
                  onClick={(e) => {
                    e.preventDefault()
                    handleTogglePin(id)
                  }}
                  type="button"
                  tabIndex={-1}
                >
                  {isPinned ? (
                    <PushPinSimpleSlash className="size-4" />
                  ) : (
                    <PushPinSimple className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[9999]">
                {isPinned ? "Unpin" : "Pin Chat"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground rounded-md p-1.5 hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={(e) => {
                    e.preventDefault()
                    setIsEditing(true)
                  }}
                  type="button"
                  tabIndex={-1}
                >
                  <PencilSimple className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[9999]">
                Edit
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-destructive/50 hover:text-destructive-foreground rounded-md p-1.5"
                  onClick={(e) => {
                    e.preventDefault()
                    setIsDeleting(true)
                  }}
                  type="button"
                  tabIndex={-1}
                >
                  <TrashSimple className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[9999]">
                Delete
              </TooltipContent>
            </Tooltip>
          </div>
        </Link>
      )}
    </li>
  )
})

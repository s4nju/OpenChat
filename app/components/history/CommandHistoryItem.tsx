"use client"

import { Button } from "@/components/ui/button"
import { CommandItem } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import {
  Check,
  GitBranch,
  PencilSimple,
  PushPinSimple,
  PushPinSimpleSlash,
  TrashSimple,
  X,
} from "@phosphor-icons/react"
import { useParams, useRouter } from "next/navigation"
import React from "react"

interface CommandHistoryItemProps {
  chat: Doc<"chats">
  chatHistory?: Doc<"chats">[]
  editingId: Id<"chats"> | null
  editTitle: string
  deletingId: Id<"chats"> | null
  handleEdit: (chat: Doc<"chats">) => void
  handleSaveEdit: (id: Id<"chats">) => void
  handleCancelEdit: () => void
  handleDelete: (id: Id<"chats">) => void
  handleConfirmDelete: (id: Id<"chats">) => void
  handleCancelDelete: () => void
  handleTogglePin: (chat: Doc<"chats">) => void
  setIsOpen: (isOpen: boolean) => void
  setEditTitle: (title: string) => void
}

export const CommandHistoryItem = React.memo(function CommandHistoryItem({
  chat,
  chatHistory,
  editingId,
  editTitle,
  deletingId,
  handleEdit,
  handleSaveEdit,
  handleCancelEdit,
  handleDelete,
  handleConfirmDelete,
  handleCancelDelete,
  handleTogglePin,
  setIsOpen,
  setEditTitle,
}: CommandHistoryItemProps) {
  const router = useRouter()
  const params = useParams<{ chatId?: string }>()
  return (
    <div key={chat._id} className="px-0 py-0.5">
      {editingId === chat._id ? (
        <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2">
          <form
            className="flex w-full items-center justify-between"
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveEdit(chat._id)
            }}
          >
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="border-input h-8 flex-1 rounded border bg-transparent px-3 py-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSaveEdit(chat._id)
                }
              }}
            />
            <div className="ml-2 flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground size-8"
                type="submit"
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground size-8"
                type="button"
                onClick={handleCancelEdit}
              >
                <X className="size-4" />
              </Button>
            </div>
          </form>
        </div>
      ) : deletingId === chat._id ? (
        <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleConfirmDelete(chat._id)
            }}
            className="flex w-full items-center justify-between"
          >
            <div className="flex flex-1 items-center">
              <span className="line-clamp-1 text-base font-normal">
                {chat.title}
              </span>
              <input
                type="text"
                className="sr-only"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault()
                    handleCancelDelete()
                  } else if (e.key === "Enter") {
                    e.preventDefault()
                    handleConfirmDelete(chat._id)
                  }
                }}
              />
            </div>
            <div className="ml-2 flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive-foreground hover:bg-destructive-foreground/10 size-8"
                type="submit"
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground size-8"
                onClick={handleCancelDelete}
                type="button"
              >
                <X className="size-4" />
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <CommandItem
          key={chat._id}
          onSelect={() => {
            if (!editingId && !deletingId) {
              // Only navigate if we're not already on this chat
              if (params.chatId !== chat._id) {
                router.replace(`/c/${chat._id}`, { scroll: false })
              }
              setIsOpen(false)
            }
          }}
          className={cn(
            "group hover:bg-accent flex h-9 w-full items-center justify-between rounded-md px-2 py-1",
            Boolean(editingId || deletingId) &&
              "hover:bg-transparent data-[selected=true]:bg-transparent"
          )}
          value={chat._id}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              {chat.originalChatId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // Only navigate if we're not already on this chat
                        if (params.chatId !== chat.originalChatId) {
                          router.push(`/c/${chat.originalChatId}`)
                        }
                        setIsOpen(false)
                      }}
                      className="text-muted-foreground/50 hover:text-muted-foreground transition-colors mr-1"
                    >
                      <GitBranch className="size-3 rotate-180" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="z-[9999]">
                    Branched From:{" "}
                    {chatHistory?.find((c) => c._id === chat.originalChatId)
                      ?.title ?? "Parent Chat"}
                  </TooltipContent>
                </Tooltip>
              )}
              <span className="line-clamp-1 flex-1 text-sm font-normal">
                {chat?.title || "Untitled Chat"}
              </span>
            </div>
          </div>
          <div className="relative flex min-w-[100px] flex-shrink-0 justify-end">
            <div
              className={cn(
                "flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-0 group-hover:opacity-100",
                Boolean(editingId || deletingId) && "group-hover:opacity-0"
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground rounded-md p-1.5 size-7 hover:bg-orange-500/20 hover:text-orange-600 dark:hover:text-orange-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTogglePin(chat)
                    }}
                    type="button"
                  >
                    {chat.isPinned ? (
                      <PushPinSimpleSlash className="size-3.5" />
                    ) : (
                      <PushPinSimple className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[9999]">
                  {chat.isPinned ? "Unpin" : "Pin Chat"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground rounded-md p-1.5 size-7 hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (chat) handleEdit(chat)
                    }}
                    type="button"
                  >
                    <PencilSimple className="size-3.5" />
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
                    className="text-muted-foreground rounded-md p-1.5 size-7 hover:bg-destructive/50 hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (chat?._id) handleDelete(chat._id)
                    }}
                    type="button"
                  >
                    <TrashSimple className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[9999]">
                  Delete
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CommandItem>
      )}
    </div>
  )
})

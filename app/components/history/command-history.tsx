"use client"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"
import { Check, ListMagnifyingGlass, PencilSimple, TrashSimple, X } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function CommandHistory() {
  const router = useRouter()
  const chatHistory = useQuery(api.chats.listChatsForUser)
  const deleteChat = useMutation(api.chats.deleteChat)
  const updateChatTitle = useMutation(api.chats.updateChatTitle)

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<Id<"chats"> | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deletingId, setDeletingId] = useState<Id<"chats"> | null>(null)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setSearchQuery("")
      setEditingId(null)
      setEditTitle("")
      setDeletingId(null)
    }
  }

  const handleEdit = (chat: Doc<"chats">) => {
    setEditingId(chat._id)
    setEditTitle(chat.title || "")
  }

  const handleSaveEdit = async (id: Id<"chats">) => {
    setEditingId(null)
    await updateChatTitle({ chatId: id, title: editTitle })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle("")
  }

  const handleDelete = (id: Id<"chats">) => {
    setDeletingId(id)
  }

  const handleConfirmDelete = async (id: Id<"chats">) => {
    setDeletingId(null)
    await deleteChat({ chatId: id })
  }

  const handleCancelDelete = () => {
    setDeletingId(null)
  }

  const filteredChat =
    chatHistory?.filter((chat) =>
      (chat.title || "").toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? []

  useEffect(() => {
    if (!isOpen || !chatHistory) return;
    chatHistory.forEach((chat) => {
      router.prefetch(`/c/${chat._id}`);
    });
  }, [isOpen, chatHistory, router]);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsOpen(true)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
            type="button"
          >
            <ListMagnifyingGlass size={24} />
          </button>
        </TooltipTrigger>
        <TooltipContent>History</TooltipContent>
      </Tooltip>

      <CommandDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        title="Chat History"
        description="Search through your past conversations"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search history..."
            value={searchQuery}
            onValueChange={(value) => setSearchQuery(value)}
          />
          <CommandList className="max-h-[480px] min-h-[480px] flex-1">
            {filteredChat.length === 0 && (
              <CommandEmpty>No chat history found.</CommandEmpty>
            )}
            <CommandGroup className="p-1.5">
              {filteredChat.map((chat) => (
                <div key={chat._id} className="px-0 py-1">
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
                          className="border-input h-8 flex-1 rounded border bg-transparent px-3 py-1 text-sm"
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
                          router.replace(`/c/${chat._id}`, {scroll: false})
                        }
                      }}
                      className={cn(
                        "group hover:bg-accent! flex w-full items-center justify-between rounded-md data-[selected=true]:bg-transparent",
                        Boolean(editingId || deletingId) &&
                        "hover:bg-transparent! data-[selected=true]:bg-transparent"
                      )}
                      value={chat.title || "Untitled Chat"}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-base font-normal">
                          {chat?.title || "Untitled Chat"}
                        </span>
                      </div>

                      {/* Date and actions container with fixed width */}
                      <div className="relative flex min-w-[120px] flex-shrink-0 justify-end">
                        {/* Date that shows by default but hides on hover */}
                        <span
                          className={cn(
                            "text-muted-foreground text-base font-normal transition-opacity duration-0 group-hover:opacity-0",
                            Boolean(editingId || deletingId) &&
                            "group-hover:opacity-100"
                          )}
                        >
                          {(chat?.updatedAt || chat?._creationTime)
                            ? new Date(chat.updatedAt || chat._creationTime || "").toLocaleDateString()
                            : "No date"}
                        </span>

                        {/* Action buttons that appear on hover, positioned over the date */}
                        <div
                          className={cn(
                            "absolute inset-0 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-0 group-hover:opacity-100",
                            Boolean(editingId || deletingId) &&
                            "group-hover:opacity-0"
                          )}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground size-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (chat) handleEdit(chat)
                            }}
                            type="button"
                          >
                            <PencilSimple className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive size-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (chat?._id) handleDelete(chat._id)
                            }}
                            type="button"
                          >
                            <TrashSimple className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CommandItem>
                  )}
                </div>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

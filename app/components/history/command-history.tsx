"use client"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
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
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import {
  getOrderedGroupKeys,
  groupChatsByTime,
  hasChatsInGroup,
} from "@/lib/chat-utils/time-grouping"
import { cn } from "@/lib/utils"
import React from "react"
import {
  Check,
  GitBranch,
  ListMagnifyingGlass,
  PencilSimple,
  PushPinSimple,
  PushPinSimpleSlash,
  TrashSimple,
  X,
} from "@phosphor-icons/react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { CommandHistoryItem } from "./CommandHistoryItem"

function getSnippet(text: string, query: string, length = 80): React.ReactNode {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return text.slice(0, length)
  const start = Math.max(0, idx - Math.floor((length - q.length) / 2))
  const snippet = text.slice(start, start + length)
  const matchStart = idx - start
  return (
    <>
      {snippet.slice(0, matchStart)}
      <mark>{snippet.slice(matchStart, matchStart + q.length)}</mark>
      {snippet.slice(matchStart + q.length)}
    </>
  )
}

export function CommandHistory() {
  const router = useRouter()
  const chatHistory = useQuery(api.chats.listChatsForUser)
  const deleteChat = useMutation(api.chats.deleteChat)
  const updateChatTitle = useMutation(api.chats.updateChatTitle)
  const pinChatToggle = useMutation(api.chats.pinChatToggle)
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const messageResults =
    useQuery(
      api.messages.searchMessages,
      searchQuery ? { query: searchQuery } : "skip"
    ) ?? []
  const [editingId, setEditingId] = useState<Id<"chats"> | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deletingId, setDeletingId] = useState<Id<"chats"> | null>(null)

  const handleEdit = useCallback((chat: Doc<"chats">) => {
    setEditingId(chat._id)
    setEditTitle(chat.title || "")
  }, [])

  const handleSaveEdit = useCallback(
    async (id: Id<"chats">) => {
      setEditingId(null)
      await updateChatTitle({ chatId: id, title: editTitle })
    },
    [editTitle, updateChatTitle]
  )

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditTitle("")
  }, [])

  const handleDelete = useCallback((id: Id<"chats">) => {
    setDeletingId(id)
  }, [])

  const handleConfirmDelete = useCallback(
    async (id: Id<"chats">) => {
      setDeletingId(null)
      await deleteChat({ chatId: id })
    },
    [deleteChat]
  )

  const handleCancelDelete = useCallback(() => {
    setDeletingId(null)
  }, [])

  const handleTogglePin = useCallback(
    async (chat: Doc<"chats">) => {
      await pinChatToggle({ chatId: chat._id })
    },
    [pinChatToggle]
  )

  // Listen for global openCommandHistory and toggleFloatingSearch events
  useEffect(() => {
    const open = () => setIsOpen(true)
    const toggle = () => setIsOpen((prev) => !prev)
    window.addEventListener("openCommandHistory", open)
    window.addEventListener("toggleFloatingSearch", toggle)
    return () => {
      window.removeEventListener("openCommandHistory", open)
      window.removeEventListener("toggleFloatingSearch", toggle)
    }
  }, [])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setSearchQuery("")
      setEditingId(null)
      setEditTitle("")
      setDeletingId(null)
    }
  }

  const filteredChat =
    chatHistory?.filter((chat) =>
      (chat.title || "").toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? []

  // Separate pinned and unpinned chats
  const pinnedChats = filteredChat.filter((chat) => chat.isPinned)
  const unpinnedChats = filteredChat.filter((chat) => !chat.isPinned)

  // Group unpinned chats by time
  const groupedChats = groupChatsByTime(unpinnedChats)
  const orderedGroupKeys = getOrderedGroupKeys()

  useEffect(() => {
    if (!isOpen || !chatHistory) return
    chatHistory.forEach((chat) => {
      router.prefetch(`/c/${chat._id}`)
    })
  }, [isOpen, chatHistory, router])

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
            {/* Invisible placeholder (size zero, no pointer) so nothing visible is preselected */}
            <CommandItem
              value="__placeholder"
              className="h-0 w-0 overflow-hidden opacity-0 pointer-events-none"
            />
            {filteredChat.length === 0 && messageResults.length === 0 && (
              <CommandEmpty>No chat history found.</CommandEmpty>
            )}

            {searchQuery && messageResults.length > 0 && (
              <div className="px-2 pb-2">
                <div className="text-muted-foreground text-sm flex h-8 shrink-0 items-center rounded-md px-1.5 font-semibold tracking-wide uppercase">
                  Messages
                </div>
                {messageResults.map((msg) => (
                  <CommandItem
                    key={msg._id}
                    onSelect={() => {
                      router.replace(`/c/${msg.chatId}?m=${msg._id}`, {
                        scroll: false,
                      })
                      setIsOpen(false)
                    }}
                    value={msg._id}
                    className="px-2 py-1"
                  >
                    <div className="flex flex-col">
                      <span className="line-clamp-2 text-sm">
                        {getSnippet(msg.content, searchQuery)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {chatHistory?.find((c) => c._id === msg.chatId)?.title ||
                          "Untitled Chat"}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </div>
            )}
            {/* Pinned Chats Section */}
            {pinnedChats.length > 0 && (
              <div className="px-2 pb-2">
                <div className="text-muted-foreground text-sm flex h-8 shrink-0 items-center rounded-md px-1.5 font-semibold tracking-wide uppercase">
                  <PushPinSimple className="mr-1.5 h-4 w-4" />
                  Pinned
                </div>
                {pinnedChats.map((chat) => (
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
                            router.replace(`/c/${chat._id}`, { scroll: false })
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
                                      router.push(`/c/${chat.originalChatId}`)
                                      setIsOpen(false)
                                    }}
                                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors mr-1"
                                  >
                                    <GitBranch className="size-3 rotate-180" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="z-[9999]">
                                  Branched From: {chatHistory?.find((c) => c._id === chat.originalChatId)?.title ?? "Parent Chat"}
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
                              Boolean(editingId || deletingId) &&
                                "group-hover:opacity-0"
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
                                  <PushPinSimpleSlash className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="z-[9999]">
                                Unpin
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
                ))}
              </div>
            )}
            {/* Time-based Groups */}
            {orderedGroupKeys.map(
              (groupKey) =>
                hasChatsInGroup(groupedChats, groupKey) && (
                  <div key={groupKey} className="px-2 pb-2">
                    <div className="text-muted-foreground flex h-8 shrink-0 items-center rounded-md px-1.5 text-sm font-semibold tracking-wide uppercase">
                      {groupKey}
                    </div>
                    {groupedChats[groupKey].map((chat) => (
                      <CommandHistoryItem
                        key={chat._id}
                        chat={chat}
                        chatHistory={chatHistory}
                        editingId={editingId}
                        editTitle={editTitle}
                        deletingId={deletingId}
                        handleEdit={handleEdit}
                        handleSaveEdit={handleSaveEdit}
                        handleCancelEdit={handleCancelEdit}
                        handleDelete={handleDelete}
                        handleConfirmDelete={handleConfirmDelete}
                        handleCancelDelete={handleCancelDelete}
                        handleTogglePin={handleTogglePin}
                        setIsOpen={setIsOpen}
                        setEditTitle={setEditTitle}
                      />
                    ))}
                  </div>
                )
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import {
  Check,
  MagnifyingGlass,
  PencilSimple,
  PushPinSimpleIcon,
  PushPinSimpleSlashIcon,
  TrashSimple,
  X,
} from "@phosphor-icons/react"
import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { useState } from "react"

type DrawerHistoryProps = {
  trigger: React.ReactNode
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function DrawerHistory({
  trigger,
  isOpen,
  setIsOpen,
}: DrawerHistoryProps) {
  const chatHistory = useQuery(api.chats.listChatsForUser)
  const deleteChat = useMutation(api.chats.deleteChat)
  const updateChatTitle = useMutation(api.chats.updateChatTitle)
  const pinChatToggle = useMutation(api.chats.pinChatToggle)

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

  const handleTogglePin = async (chat: Doc<"chats">) => {
    await pinChatToggle({ chatId: chat._id })
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

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        </TooltipTrigger>
        <TooltipContent>History</TooltipContent>
      </Tooltip>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>History</DrawerTitle>
          <DrawerDescription className="hidden">
            History of your chats
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex h-dvh max-h-[80vh] flex-col">
          <div className="border-b p-4 pb-3">
            <div className="relative">
              <Input
                placeholder="Search..."
                className="rounded-lg py-1.5 pl-8 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <MagnifyingGlass className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 transform text-gray-400" />
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="flex flex-col space-y-2 px-4 pt-4 pb-8">
              {/* Pinned Chats Section */}
              {pinnedChats.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-muted-foreground flex items-center px-2 text-xs font-medium tracking-wider uppercase">
                    <PushPinSimpleIcon className="mr-1 h-3 w-3" />
                    Pinned
                  </h3>
                  {pinnedChats.map((chat) => (
                    <div key={chat._id}>
                      <div className="space-y-1.5">
                        {editingId === chat._id ? (
                          <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2.5">
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
                                className="h-8 flex-1"
                                autoFocus
                              />
                              <div className="ml-2 flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  type="submit"
                                >
                                  <Check className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  type="button"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            </form>
                          </div>
                        ) : deletingId === chat._id ? (
                          <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2.5">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault()
                                handleConfirmDelete(chat._id)
                              }}
                              className="flex w-full items-center justify-between"
                            >
                              <div className="flex flex-1 items-center">
                                <span className="text-base font-normal">
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
                                    }
                                  }}
                                />
                              </div>
                              <div className="ml-2 flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-destructive size-8"
                                  type="submit"
                                >
                                  <Check className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-destructive size-8"
                                  onClick={handleCancelDelete}
                                  type="button"
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          <div className="group flex items-center justify-between rounded-lg px-2 py-1.5">
                            <Link
                              href={`/c/${chat._id}`}
                              prefetch
                              className="flex flex-1 flex-col items-start"
                            >
                              <span className="line-clamp-1 text-base font-normal">
                                {chat.title}
                              </span>
                            </Link>
                            <div className="flex items-center">
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground size-8 hover:text-orange-600"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleTogglePin(chat)
                                  }}
                                  type="button"
                                >
                                  <PushPinSimpleSlashIcon className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-foreground size-8"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleEdit(chat)
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
                                    e.preventDefault()
                                    handleDelete(chat._id)
                                  }}
                                  type="button"
                                >
                                  <TrashSimple className="size-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Time-based Groups */}
              {orderedGroupKeys.map(
                (groupKey) =>
                  hasChatsInGroup(groupedChats, groupKey) && (
                    <div key={groupKey} className="space-y-2">
                      <h3 className="text-muted-foreground px-2 text-xs font-medium tracking-wider uppercase">
                        {groupKey}
                      </h3>
                      {groupedChats[groupKey].map((chat) => (
                        <div key={chat._id}>
                          <div className="space-y-1.5">
                            {editingId === chat._id ? (
                              <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2.5">
                                <form
                                  className="flex w-full items-center justify-between"
                                  onSubmit={(e) => {
                                    e.preventDefault()
                                    handleSaveEdit(chat._id)
                                  }}
                                >
                                  <Input
                                    value={editTitle}
                                    onChange={(e) =>
                                      setEditTitle(e.target.value)
                                    }
                                    className="h-8 flex-1"
                                    autoFocus
                                  />
                                  <div className="ml-2 flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      type="submit"
                                    >
                                      <Check className="size-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      type="button"
                                      onClick={handleCancelEdit}
                                    >
                                      <X className="size-4" />
                                    </Button>
                                  </div>
                                </form>
                              </div>
                            ) : deletingId === chat._id ? (
                              <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2.5">
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault()
                                    handleConfirmDelete(chat._id)
                                  }}
                                  className="flex w-full items-center justify-between"
                                >
                                  <div className="flex flex-1 items-center">
                                    <span className="text-base font-normal">
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
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="ml-2 flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-muted-foreground hover:text-destructive size-8"
                                      type="submit"
                                    >
                                      <Check className="size-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-muted-foreground hover:text-destructive size-8"
                                      onClick={handleCancelDelete}
                                      type="button"
                                    >
                                      <X className="size-4" />
                                    </Button>
                                  </div>
                                </form>
                              </div>
                            ) : (
                              <div className="group flex items-center justify-between rounded-lg px-2 py-1.5">
                                <Link
                                  href={`/c/${chat._id}`}
                                  prefetch
                                  className="flex flex-1 flex-col items-start"
                                >
                                  <span className="line-clamp-1 text-base font-normal">
                                    {chat.title}
                                  </span>
                                </Link>
                                <div className="flex items-center">
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-muted-foreground size-8 hover:text-orange-600"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handleTogglePin(chat)
                                      }}
                                      type="button"
                                    >
                                      <PushPinSimpleIcon className="size-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-muted-foreground hover:text-foreground size-8"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handleEdit(chat)
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
                                        e.preventDefault()
                                        handleDelete(chat._id)
                                      }}
                                      type="button"
                                    >
                                      <TrashSimple className="size-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
              )}
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

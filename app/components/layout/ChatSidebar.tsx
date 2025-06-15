"use client"

import { useChatSession } from "@/app/providers/chat-session-provider"
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
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import {
  getOrderedGroupKeys,
  groupChatsByTime,
  hasChatsInGroup,
} from "@/lib/chat-utils/time-grouping"
import { APP_NAME } from "@/lib/config"
import {
  Check,
  GitBranch,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  SidebarSimple,
  TrashSimple,
  X,
} from "@phosphor-icons/react"
import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// Helper function for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(" ")

// Define props
interface ChatSidebarProps {
  isOpen: boolean
  toggleSidebar: () => void
}

export default function ChatSidebar({
  isOpen,
  toggleSidebar,
}: ChatSidebarProps) {
  const chats = useQuery(api.chats.listChatsForUser) ?? []
  const updateChatTitle = useMutation(api.chats.updateChatTitle)
  const deleteChat = useMutation(api.chats.deleteChat)
  const { setIsDeleting: setChatIsDeleting } = useChatSession()

  const params = useParams<{ chatId?: string }>()
  const router = useRouter()
  const pathname = usePathname()

  // State for search and edit/delete in the main sidebar list
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<Id<"chats"> | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deletingId, setDeletingId] = useState<Id<"chats"> | null>(null)
  // State for the floating command history (search icon in collapsed mode)
  const [showFloatingSearch, setShowFloatingSearch] = useState(false)
  const [floatingSearchQuery, setFloatingSearchQuery] = useState("")
  const [floatingEditingId, setFloatingEditingId] =
    useState<Id<"chats"> | null>(null)
  const [floatingEditTitle, setFloatingEditTitle] = useState("")
  const [floatingDeletingId, setFloatingDeletingId] =
    useState<Id<"chats"> | null>(null)

  // --- Handlers for main sidebar list ---
  const handleSaveEdit = async (id: Id<"chats">, newTitle: string) => {
    setEditingId(null)
    await updateChatTitle({ chatId: id, title: newTitle })
  }
  const handleConfirmDelete = async (id: Id<"chats">) => {
    setDeletingId(null)
    setFloatingDeletingId(null) // Ensure floating delete state is also cleared
    setChatIsDeleting(true)
    await deleteChat({ chatId: id })
    if (params.chatId === id) {
      router.push("/")
    }
    // Reset the deleting state after the mutation and any routing logic complete
    setChatIsDeleting(false)
  }
  const filteredChats = chats.filter((chat) =>
    (chat.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group chats by time for main sidebar
  const groupedChats = groupChatsByTime(filteredChats)
  const orderedGroupKeys = getOrderedGroupKeys()

  // Filter for floating dialog
  const floatingFilteredChats = chats.filter((chat) =>
    (chat.title || "").toLowerCase().includes(floatingSearchQuery.toLowerCase())
  )

  // Group chats by time for floating search
  const floatingGroupedChats = groupChatsByTime(floatingFilteredChats)

  // --- Handlers specifically for the Floating Command Dialog ---
  const handleFloatingEdit = (chat: Doc<"chats">) => {
    setFloatingEditingId(chat._id)
    setFloatingEditTitle(chat.title || "")
  }

  const handleFloatingSaveEdit = async (id: Id<"chats">) => {
    setFloatingEditingId(null)
    await handleSaveEdit(id, floatingEditTitle)
  }

  const handleFloatingCancelEdit = () => {
    setFloatingEditingId(null)
    setFloatingEditTitle("")
  }

  const handleFloatingDelete = (id: Id<"chats">) => {
    setFloatingDeletingId(id)
  }

  const handleFloatingConfirmDelete = async (id: Id<"chats">) => {
    setFloatingDeletingId(null)
    await handleConfirmDelete(id)
  }

  const handleFloatingCancelDelete = () => {
    setFloatingDeletingId(null)
  }

  // Listen for programmatic open
  useEffect(() => {
    const toggle = () => setShowFloatingSearch((prev) => !prev)
    window.addEventListener("toggleFloatingSearch", toggle)
    return () => window.removeEventListener("toggleFloatingSearch", toggle)
  }, [])

  // Prefetch chats when floating search opens
  useEffect(() => {
    if (!showFloatingSearch) return
    chats.forEach((chat) => {
      router.prefetch(`/c/${chat._id}`)
    })
  }, [showFloatingSearch, chats, router])

  return (
    <div className="z-51 hidden md:block">
      {/* Fixed collapse button with animated extra buttons (always same size/position) */}
      <div className="fixed top-4 left-4 z-[60] flex flex-row items-center">
        <button
          type="button"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          tabIndex={0}
          onClick={toggleSidebar}
          className={
            "group hover:bg-accent focus-visible:ring-primary bg-background/80 dark:bg-muted/80 dark:border-muted-foreground/20 flex items-center justify-center rounded-full border border-transparent p-2 shadow-lg backdrop-blur transition-all duration-300 outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-offset-2"
          }
        >
          <SidebarSimple
            className="text-muted-foreground group-hover:text-foreground size-5 transition-colors"
            weight="bold"
          />
        </button>
        {/* Animated search and new chat buttons in collapsed state only */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Search"
              tabIndex={isOpen ? -1 : 0}
              onClick={() => {
                if (!isOpen) setShowFloatingSearch(true)
              }}
              style={{ transitionDelay: isOpen ? "0ms" : "100ms" }}
              className={`group hover:bg-accent focus-visible:ring-primary ml-1 flex items-center justify-center rounded-full p-2 transition-all duration-300 ease-in-out outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 ${isOpen ? "pointer-events-none -translate-x-2 scale-50 opacity-0" : "translate-x-0 scale-100 opacity-100"}`}
            >
              <MagnifyingGlass
                className="text-muted-foreground group-hover:text-foreground size-5 transition-colors"
                weight="bold"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>
        {!(pathname === "/" && !isOpen) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="New chat"
                tabIndex={isOpen ? -1 : 0}
                onClick={() => router.push("/")}
                style={{ transitionDelay: isOpen ? "0ms" : "200ms" }}
                className={`group hover:bg-accent focus-visible:ring-primary ml-1 flex items-center justify-center rounded-full p-2 transition-all duration-300 ease-in-out outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 ${isOpen ? "pointer-events-none -translate-x-2 scale-50 opacity-0" : "translate-x-0 scale-100 opacity-100"}`}
              >
                <Plus
                  className="text-muted-foreground group-hover:text-foreground size-5 transition-colors"
                  weight="bold"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>New Chat</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* The actual sidebar panel - NO LONGER FIXED or TRANSLATING */}
      <aside
        className={cn(
          "bg-background border-muted-foreground/10 flex h-screen flex-col border-r shadow-lg",
          isOpen ? "w-64" : "hidden w-0",
          "transition-all duration-300 ease-in-out"
        )}
      >
        <div className="flex h-[60px] shrink-0 items-center justify-center pt-1">
          <Link
            href="/"
            prefetch
            className="text-lg font-medium tracking-tight lowercase"
          >
            {APP_NAME}
          </Link>
        </div>

        <div
          className={cn(
            "flex flex-grow flex-col gap-3 overflow-y-auto px-4 pt-4",
            "transition-opacity duration-300 ease-in-out",
            isOpen ? "opacity-100 delay-150" : "opacity-0"
          )}
        >
          <Button
            variant="outline"
            className="h-9 w-full justify-start text-sm"
            onClick={() => pathname !== "/" && router.push("/")}
          >
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>

          <div className="relative">
            <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search chats..."
              className="h-9 w-full pl-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus={isOpen}
            />
          </div>

          <div className="flex flex-col space-y-2 pt-2 pb-8">
            {filteredChats.length === 0 && (
              <span className="text-muted-foreground text-sm">
                No chat history found.
              </span>
            )}
            {orderedGroupKeys.map(
              (groupKey) =>
                hasChatsInGroup(groupedChats, groupKey) && (
                  <div key={groupKey} className="space-y-2">
                    <h3 className="text-muted-foreground text-m px-2 font-medium tracking-wider uppercase">
                      {groupKey}
                    </h3>
                    {groupedChats[groupKey].map((chat) => (
                      <div key={chat._id} className="space-y-1.5">
                        {editingId === chat._id ? (
                          <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2.5">
                            <form
                              className="flex w-full items-center justify-between"
                              onSubmit={(e) => {
                                e.preventDefault()
                                handleSaveEdit(chat._id, editTitle)
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
                                  className="text-muted-foreground hover:text-destructive size-8"
                                  type="submit"
                                >
                                  <Check className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-destructive size-8"
                                  onClick={() => setEditingId(null)}
                                  type="button"
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "group flex items-center justify-between rounded-lg px-2 py-1.5",
                              params.chatId === chat._id && "bg-accent",
                              "hover:bg-accent"
                            )}
                          >
                            {deletingId === chat._id ? (
                              <div className="flex w-full items-center justify-between py-1">
                                <span className="text-destructive mt-0.5 ml-1 text-sm font-medium">
                                  Delete chat?
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-muted-foreground hover:text-destructive size-8"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      handleConfirmDelete(chat._id)
                                    }}
                                    type="button"
                                  >
                                    <Check className="size-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-muted-foreground hover:text-foreground size-8"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setDeletingId(null)
                                    }}
                                    type="button"
                                  >
                                    <X className="size-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Link
                                  href={`/c/${chat._id}`}
                                  prefetch
                                  replace
                                  scroll={false}
                                  key={chat._id}
                                  className="flex flex-1 flex-col items-start"
                                >
                                  <div className="flex w-full items-center gap-1.5">
                                    {chat.originalChatId && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              router.push(
                                                `/c/${chat.originalChatId}`
                                              )
                                            }}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            <GitBranch className="size-3" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Go to original chat
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    <span className="line-clamp-1 flex-1 p-0 text-sm font-normal">
                                      {chat.title}
                                    </span>
                                  </div>
                                </Link>
                                <div className="flex items-center">
                                  <div className="hidden gap-1 group-hover:flex">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-muted-foreground hover:text-foreground size-8"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        setEditingId(chat._id)
                                        setEditTitle(chat.title || "")
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
                                        setDeletingId(chat._id)
                                      }}
                                      type="button"
                                    >
                                      <TrashSimple className="size-4" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
            )}
          </div>
        </div>
      </aside>
      <CommandDialog
        open={showFloatingSearch}
        onOpenChange={(open) => {
          setShowFloatingSearch(open)
          if (!open) {
            setFloatingSearchQuery("")
            setFloatingEditingId(null)
            setFloatingEditTitle("")
            setFloatingDeletingId(null)
          }
        }}
        title="Chat History"
        description="Search through your past conversations"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search history..."
            value={floatingSearchQuery}
            onValueChange={(value) => setFloatingSearchQuery(value)}
          />
          <CommandList className="max-h-[480px] min-h-[480px] flex-1">
            {floatingFilteredChats.length === 0 && (
              <CommandEmpty>No chat history found.</CommandEmpty>
            )}
            {orderedGroupKeys.map(
              (groupKey) =>
                hasChatsInGroup(floatingGroupedChats, groupKey) && (
                  <CommandGroup
                    key={groupKey}
                    heading={groupKey}
                    className="p-1.5"
                  >
                    {floatingGroupedChats[groupKey].map((chat) => (
                      <div key={chat._id} className="px-0 py-1">
                        {floatingEditingId === chat._id ? (
                          <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2">
                            <form
                              className="flex w-full items-center justify-between"
                              onSubmit={(e) => {
                                e.preventDefault()
                                handleFloatingSaveEdit(chat._id)
                              }}
                            >
                              <Input
                                value={floatingEditTitle}
                                onChange={(e) =>
                                  setFloatingEditTitle(e.target.value)
                                }
                                className="h-8 flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    handleFloatingCancelEdit()
                                  }
                                }}
                              />
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
                                  onClick={handleFloatingCancelEdit}
                                  type="button"
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            </form>
                          </div>
                        ) : floatingDeletingId === chat._id ? (
                          <div className="bg-destructive/10 flex items-center justify-between rounded-lg px-2 py-2">
                            <form
                              className="flex w-full items-center justify-between"
                              onSubmit={(e) => {
                                e.preventDefault()
                                handleFloatingConfirmDelete(chat._id)
                              }}
                            >
                              <span className="text-destructive px-2 text-sm">
                                Confirm delete?
                              </span>
                              <div className="ml-2 flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive size-8"
                                  type="submit"
                                >
                                  <Check className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-foreground size-8"
                                  onClick={handleFloatingCancelDelete}
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
                              if (!floatingEditingId && !floatingDeletingId) {
                                router.replace(`/c/${chat._id}`, {
                                  scroll: false,
                                })
                                setShowFloatingSearch(false) // Close dialog on selection
                              }
                            }}
                            className={cn(
                              "group hover:bg-accent! flex w-full items-center justify-between rounded-md data-[selected=true]:bg-transparent",
                              Boolean(
                                floatingEditingId || floatingDeletingId
                              ) &&
                                "hover:bg-transparent! data-[selected=true]:bg-transparent"
                            )}
                            value={chat.title || "Untitled Chat"}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {chat.originalChatId && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          router.push(
                                            `/c/${chat.originalChatId}`
                                          )
                                          setShowFloatingSearch(false)
                                        }}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <GitBranch className="size-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Go to original chat
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <span className="line-clamp-1 flex-1 text-base font-normal">
                                  {chat?.title || "Untitled Chat"}
                                </span>
                              </div>
                            </div>

                            <div className="relative flex min-w-[120px] flex-shrink-0 justify-end">
                              <div
                                className={cn(
                                  "absolute inset-0 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-0 group-hover:opacity-100",
                                  Boolean(
                                    floatingEditingId || floatingDeletingId
                                  ) && "group-hover:opacity-0"
                                )}
                              >
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-foreground size-8"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (chat) handleFloatingEdit(chat)
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
                                    if (chat?._id)
                                      handleFloatingDelete(chat._id)
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
                )
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}

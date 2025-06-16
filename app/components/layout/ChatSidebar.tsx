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
  PushPinSimple,
  PushPinSimpleSlash,
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
  const pinChatToggle = useMutation(api.chats.pinChatToggle)
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

  const handleTogglePin = async (chat: Doc<"chats">) => {
    await pinChatToggle({ chatId: chat._id })
  }
  const filteredChats = chats.filter((chat) =>
    (chat.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Separate pinned and unpinned chats
  const pinnedChats = filteredChats.filter((chat) => chat.isPinned)
  const unpinnedChats = filteredChats.filter((chat) => !chat.isPinned)

  // Group unpinned chats by time for main sidebar
  const groupedChats = groupChatsByTime(unpinnedChats)
  const orderedGroupKeys = getOrderedGroupKeys()

  // Filter for floating dialog
  const floatingFilteredChats = chats.filter((chat) =>
    (chat.title || "").toLowerCase().includes(floatingSearchQuery.toLowerCase())
  )

  // Separate pinned and unpinned for floating search
  const floatingPinnedChats = floatingFilteredChats.filter(
    (chat) => chat.isPinned
  )
  const floatingUnpinnedChats = floatingFilteredChats.filter(
    (chat) => !chat.isPinned
  )

  // Group chats by time for floating search
  const floatingGroupedChats = groupChatsByTime(floatingUnpinnedChats)

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
            "flex flex-grow flex-col gap-3 overflow-y-auto p-2", // Changed px-4 pt-4 to p-2
            "transition-opacity duration-300 ease-in-out",
            isOpen ? "opacity-100 delay-150" : "opacity-0"
          )}
        >
          <Button
            variant="outline"
            className="h-9 w-full justify-center text-sm font-bold"
            onClick={() => pathname !== "/" && router.push("/")}
          >
            New Chat
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

          <div className="flex flex-col pt-2 pb-8">
            {" "}
            {/* Removed space-y-1 */}
            {filteredChats.length === 0 && (
              <span className="text-muted-foreground px-1.5 text-sm">
                {" "}
                {/* Added px-1.5 for alignment */}
                No chat history found.
              </span>
            )}
            {/* Pinned Chats Section */}
            {pinnedChats.length > 0 && (
              <div className="relative flex w-full min-w-0 flex-col p-2">
                <h3 className="text-muted-foreground focus-visible:ring-primary flex h-8 shrink-0 items-center rounded-md px-1.5 text-xs font-medium tracking-wider uppercase outline-none select-none focus-visible:ring-2">
                  <PushPinSimple className="mr-1 h-3 w-3" />
                  Pinned
                </h3>
                <ul className="flex w-full min-w-0 flex-col gap-1 text-sm">
                  {pinnedChats.map((chat) => (
                    <li key={chat._id} className="group/menu-item relative">
                      {editingId === chat._id ? (
                        <div className="group/menu-item bg-accent relative flex h-9 items-center rounded-lg px-2 py-0.5">
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
                                onClick={() => setEditingId(null)}
                                type="button"
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          </form>
                        </div>
                      ) : deletingId === chat._id ? (
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
                                  handleConfirmDelete(chat._id)
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
                                  setDeletingId(null)
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
                          href={`/c/${chat._id}`}
                          prefetch
                          replace
                          scroll={false}
                          key={chat._id}
                          className={cn(
                            "group/link relative flex h-9 w-full items-center overflow-hidden rounded-lg px-2 py-1 text-sm outline-none",
                            "hover:bg-accent hover:text-accent-foreground focus-visible:text-accent-foreground",
                            "focus-visible:ring-primary focus-visible:ring-2",
                            params.chatId === chat._id &&
                              "bg-accent text-accent-foreground"
                          )}
                        >
                          <div className="relative flex w-full items-center">
                            {chat.originalChatId && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault()
                                      router.push(`/c/${chat.originalChatId}`)
                                    }}
                                    className="text-muted-foreground/50 hover:text-muted-foreground mr-1"
                                  >
                                    <GitBranch className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Go to original chat
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <div className="relative w-full">
                              <span className="hover:truncate-none pointer-events-none block h-full w-full cursor-pointer truncate overflow-hidden rounded bg-transparent px-1 py-1 text-sm outline-none">
                                {chat.title}
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
                                    handleTogglePin(chat)
                                  }}
                                  type="button"
                                  tabIndex={-1}
                                >
                                  <PushPinSimpleSlash className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="z-[9999]"
                              >
                                Unpin
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
                                    setEditingId(chat._id)
                                    setEditTitle(chat.title || "")
                                  }}
                                  type="button"
                                  tabIndex={-1}
                                >
                                  <PencilSimple className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="z-[9999]"
                              >
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
                                    setDeletingId(chat._id)
                                  }}
                                  type="button"
                                  tabIndex={-1}
                                >
                                  <TrashSimple className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="z-[9999]"
                              >
                                Delete
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {orderedGroupKeys.map(
              (groupKey) =>
                hasChatsInGroup(groupedChats, groupKey) && (
                  <div
                    key={groupKey}
                    className="relative flex w-full min-w-0 flex-col p-2"
                  >
                    {" "}
                    {/* Matches example group container */}
                    <h3 className="text-muted-foreground focus-visible:ring-primary flex h-8 shrink-0 items-center rounded-md px-1.5 text-xs font-medium tracking-wider uppercase outline-none select-none focus-visible:ring-2">
                      {" "}
                      {/* Matches example group-label */}
                      {groupKey}
                    </h3>
                    <ul className="flex w-full min-w-0 flex-col gap-1 text-sm">
                      {" "}
                      {/* Matches example menu ul */}
                      {groupedChats[groupKey].map((chat) => (
                        <li key={chat._id} className="group/menu-item relative">
                          {" "}
                          {/* Matches example menu-item li */}
                          {editingId === chat._id ? (
                            <div className="group/menu-item bg-accent relative flex h-9 items-center rounded-lg px-2 py-0.5">
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
                                    onClick={() => setEditingId(null)}
                                    type="button"
                                  >
                                    <X className="size-4" />
                                  </Button>
                                </div>
                              </form>
                            </div>
                          ) : deletingId === chat._id ? (
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
                                      handleConfirmDelete(chat._id)
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
                                      setDeletingId(null)
                                    }}
                                    type="button"
                                  >
                                    <X className="size-4" />
                                  </Button>
                                </div>
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
                                className={cn(
                                  "group/link relative flex h-9 w-full items-center overflow-hidden rounded-lg px-2 py-1 text-sm outline-none",
                                  "hover:bg-accent hover:text-accent-foreground focus-visible:text-accent-foreground",
                                  "focus-visible:ring-primary focus-visible:ring-2",
                                  params.chatId === chat._id &&
                                    "bg-accent text-accent-foreground"
                                )}
                              >
                                <div className="relative flex w-full items-center">
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
                                          className="text-muted-foreground/50 hover:text-muted-foreground mr-1"
                                        >
                                          <GitBranch className="h-4 w-4" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Go to original chat
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  <div className="relative w-full">
                                    <span className="hover:truncate-none pointer-events-none block h-full w-full cursor-pointer truncate overflow-hidden rounded bg-transparent px-1 py-1 text-sm outline-none">
                                      {chat.title}
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
                                          handleTogglePin(chat)
                                        }}
                                        type="button"
                                        tabIndex={-1}
                                      >
                                        <PushPinSimple className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      className="z-[9999]"
                                    >
                                      Pin Chat
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
                                          setEditingId(chat._id)
                                          setEditTitle(chat.title || "")
                                        }}
                                        type="button"
                                        tabIndex={-1}
                                      >
                                        <PencilSimple className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      className="z-[9999]"
                                    >
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
                                          setDeletingId(chat._id)
                                        }}
                                        type="button"
                                        tabIndex={-1}
                                      >
                                        <TrashSimple className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      className="z-[9999]"
                                    >
                                      Delete
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </Link>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
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
            {/* Pinned Chats Section */}
            {floatingPinnedChats.length > 0 && (
              <CommandGroup heading="📌 Pinned" className="p-1.5">
                {floatingPinnedChats.map((chat) => (
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
                            Delete this chat?
                          </span>
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
                              onClick={() => setFloatingDeletingId(null)}
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
                        value={chat._id}
                        className="hover:bg-accent group relative flex h-auto w-full items-center justify-between px-2 py-2 text-sm"
                        onSelect={() => {
                          if (!floatingEditingId && !floatingDeletingId) {
                            router.replace(`/c/${chat._id}`, {
                              scroll: false,
                            })
                            setShowFloatingSearch(false)
                          }
                        }}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {chat.originalChatId && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                router.push(`/c/${chat.originalChatId}`)
                                setShowFloatingSearch(false)
                              }}
                              className="text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors"
                            >
                              <GitBranch className="h-3 w-3" />
                            </button>
                          )}
                          <span className="line-clamp-1 flex-1 text-left">
                            {chat.title || "Untitled Chat"}
                          </span>
                        </div>
                        <div className="opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive size-8"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleTogglePin(chat)
                              }}
                              type="button"
                            >
                              <PushPinSimpleSlash className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground size-8"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleFloatingEdit(chat)
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
                                e.stopPropagation()
                                setFloatingDeletingId(chat._id)
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
                                  className="text-muted-foreground size-8 hover:text-orange-600"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (chat) handleTogglePin(chat)
                                  }}
                                  type="button"
                                >
                                  <PushPinSimple className="size-4" />
                                </Button>
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

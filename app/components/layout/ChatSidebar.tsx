"use client"

import { useChatSession } from "@/app/providers/chat-session-provider"
import { Button } from "@/components/ui/button"
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
import { useState } from "react"

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

  // --- Handlers for main sidebar list ---
  const handleSaveEdit = async (id: Id<"chats">, newTitle: string) => {
    setEditingId(null)
    await updateChatTitle({ chatId: id, title: newTitle })
  }
  const handleConfirmDelete = async (id: Id<"chats">) => {
    setDeletingId(null)
    const isCurrentChat = params.chatId === id
    if (isCurrentChat) {
      // Signal to the active Chat component that we are deleting it so it can
      // suppress the "Chat not found" toast during the brief race condition
      // between the mutation completing and the route change finishing.
      setChatIsDeleting(true)
    }

    try {
      await deleteChat({ chatId: id })

      if (isCurrentChat) {
        router.push("/")
        // We intentionally do NOT reset `isDeleting` here. The
        // ChatSessionProvider will automatically clear this flag when the route
        // (and therefore the chatId) changes, ensuring the flag remains set
        // long enough for the Chat component to unmount and preventing a false
        // "Chat not found" error toast.
      }
    } catch (err) {
      // Roll back deletion flag on error so UI interactions are not blocked.
      if (isCurrentChat) {
        setChatIsDeleting(false)
      }
      throw err
    }
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
                if (!isOpen)
                  window.dispatchEvent(new Event("openCommandHistory"))
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
                                    <GitBranch className="h-4 w-4 rotate-180" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="z-[9999]">
                                  Branched From: {chats.find((c) => c._id === chat.originalChatId)?.title ?? "Parent Chat"}
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
                                            router.push(`/c/${chat.originalChatId}`)
                                          }}
                                          className="text-muted-foreground/50 hover:text-muted-foreground mr-1"
                                        >
                                          <GitBranch className="h-4 w-4 rotate-180" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="z-[9999]">
                                        Branched From: {chats.find((c) => c._id === chat.originalChatId)?.title ?? "Parent Chat"}
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
    </div>
  )
}

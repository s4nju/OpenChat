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
import { Id } from "@/convex/_generated/dataModel"
import {
  getOrderedGroupKeys,
  groupChatsByTime,
  hasChatsInGroup,
} from "@/lib/chat-utils/time-grouping"
import { APP_NAME } from "@/lib/config"
import {
  MagnifyingGlass,
  Plus,
  SidebarSimple,
} from "@phosphor-icons/react"
import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { ChatList } from "./ChatList"

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

  // --- Handlers for main sidebar list ---
  const handleSaveEdit = useCallback(
    async (id: Id<"chats">, newTitle: string) => {
      await updateChatTitle({ chatId: id, title: newTitle })
    },
    [updateChatTitle]
  )

  const handleConfirmDelete = useCallback(
    async (id: Id<"chats">) => {
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
    },
    [params.chatId, deleteChat, router, setChatIsDeleting]
  )

  const handleTogglePin = useCallback(
    async (id: Id<"chats">) => {
      await pinChatToggle({ chatId: id })
    },
    [pinChatToggle]
  )
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
          "bg-background border-muted-foreground/10 flex h-dvh flex-col border-r shadow-lg",
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

          <ChatList
            pinnedChats={pinnedChats}
            groupedChats={groupedChats}
            orderedGroupKeys={orderedGroupKeys}
            handleSaveEdit={handleSaveEdit}
            handleConfirmDelete={handleConfirmDelete}
            handleTogglePin={handleTogglePin}
            hasChatsInGroup={hasChatsInGroup}
          />
        </div>
      </aside>
    </div>
  )
}

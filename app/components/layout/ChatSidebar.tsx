"use client"

import { SidebarSimple, MagnifyingGlass, Plus, PencilSimple, TrashSimple, Check, X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { APP_NAME } from "@/lib/config"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { useParams, useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useChatSession } from "@/app/providers/chat-session-provider"

// Helper function for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// Define props
interface ChatSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function ChatSidebar({ isOpen, toggleSidebar }: ChatSidebarProps) {
  const chats = useQuery(api.chats.listChatsForUser) ?? [];
  const updateChatTitle = useMutation(api.chats.updateChatTitle);
  const deleteChat = useMutation(api.chats.deleteChat);
  const { setIsDeleting: setChatIsDeleting } = useChatSession();

  const params = useParams<{ chatId?: string }>();
  const router = useRouter();
  const pathname = usePathname();

  // State for search and edit/delete in the main sidebar list
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<Id<"chats"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<Id<"chats"> | null>(null);
  // State for the floating command history (search icon in collapsed mode)
  const [showFloatingSearch, setShowFloatingSearch] = useState(false);
  const [floatingSearchQuery, setFloatingSearchQuery] = useState("");
  const [floatingEditingId, setFloatingEditingId] = useState<Id<"chats"> | null>(null);
  const [floatingEditTitle, setFloatingEditTitle] = useState("");
  const [floatingDeletingId, setFloatingDeletingId] = useState<Id<"chats"> | null>(null);

  // --- Handlers for main sidebar list --- 
  const handleSaveEdit = async (id: Id<"chats">, newTitle: string) => {
    setEditingId(null);
    await updateChatTitle({ chatId: id, title: newTitle });
  };
  const handleConfirmDelete = async (id: Id<"chats">) => {
    setDeletingId(null);
    setFloatingDeletingId(null); // Ensure floating delete state is also cleared
    setChatIsDeleting(true);
    await deleteChat({ chatId: id });
    if (params.chatId === id) {
      router.push("/");
    }
    // Reset the deleting state after the mutation and any routing logic complete
    setChatIsDeleting(false);
  };
  const filteredChats = chats.filter((chat) => (chat.title || "").toLowerCase().includes(searchQuery.toLowerCase()));

  // --- Handlers specifically for the Floating Command Dialog ---
  const handleFloatingEdit = (chat: Doc<"chats">) => {
    setFloatingEditingId(chat._id);
    setFloatingEditTitle(chat.title || "");
  }

  const handleFloatingSaveEdit = async (id: Id<"chats">) => {
    setFloatingEditingId(null);
    await handleSaveEdit(id, floatingEditTitle); 
  }

  const handleFloatingCancelEdit = () => {
    setFloatingEditingId(null);
    setFloatingEditTitle("");
  }

  const handleFloatingDelete = (id: Id<"chats">) => {
    setFloatingDeletingId(id);
  }

  const handleFloatingConfirmDelete = async (id: Id<"chats">) => {
    setFloatingDeletingId(null);
    await handleConfirmDelete(id); 
  }

  const handleFloatingCancelDelete = () => {
    setFloatingDeletingId(null);
  }

  // Filter for floating dialog
  const floatingFilteredChats = chats.filter((chat) =>
    (chat.title || "").toLowerCase().includes(floatingSearchQuery.toLowerCase())
  );

  // Close floating search if sidebar opens
  useEffect(() => {
    if (isOpen) {
      setShowFloatingSearch(false);
    }
  }, [isOpen]);

  // Prefetch chats when floating search opens
  useEffect(() => {
    if (!showFloatingSearch) return;
    chats.forEach((chat) => {
      router.prefetch(`/c/${chat._id}`);
    });
  }, [showFloatingSearch, chats, router]);

  return (
    <div className="hidden md:block z-51">
      {/* Fixed collapse button with animated extra buttons (always same size/position) */}
      <div className="fixed top-4 left-4 z-[60] flex flex-row items-center">
        <button
          type="button"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          tabIndex={0}
          onClick={toggleSidebar}
          className={
            "group flex items-center justify-center rounded-full p-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-full outline-none bg-background/80 dark:bg-muted/80 border border-transparent dark:border-muted-foreground/20 shadow-lg backdrop-blur transition-all duration-300"
          }
        >
          <SidebarSimple className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" weight="bold" />
        </button>
        {/* Animated search and new chat buttons in collapsed state only */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Search"
              tabIndex={isOpen ? -1 : 0}
              onClick={() => { if (!isOpen) setShowFloatingSearch(true); }}
              style={{ transitionDelay: isOpen ? '0ms' : '100ms' }}
              className={
                `group flex items-center justify-center rounded-full p-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-full outline-none ml-1 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 scale-50 -translate-x-2 pointer-events-none' : 'opacity-100 scale-100 translate-x-0'}`
              }
            >
              <MagnifyingGlass className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" weight="bold" />
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
              onClick={() => router.push('/')}
              style={{ transitionDelay: isOpen ? '0ms' : '200ms' }}
              className={
                `group flex items-center justify-center rounded-full p-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-full outline-none ml-1 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 scale-50 -translate-x-2 pointer-events-none' : 'opacity-100 scale-100 translate-x-0'}`
              }
            >
              <Plus className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" weight="bold" />
            </button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
        )}
      </div>

      {/* The actual sidebar panel - NO LONGER FIXED or TRANSLATING */}
      <aside
        className={cn(
          "h-screen bg-background border-r border-muted-foreground/10 shadow-lg flex flex-col",
          isOpen ? "w-64" : "w-0 hidden",
          "transition-all duration-300 ease-in-out"
        )}
      >
        <div className="flex h-[60px] items-center justify-center pt-1 shrink-0">
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
            "flex flex-col px-4 pt-4 gap-3 overflow-y-auto flex-grow",
            "transition-opacity duration-300 ease-in-out",
            isOpen ? "opacity-100 delay-150" : "opacity-0"
          )}
        >
          <Button
            variant="outline"
            className="w-full justify-start text-sm h-9"
            onClick={() => pathname !== '/' && router.push('/')}
          >
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>

          <div className="relative">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search chats..."
              className="pl-8 w-full h-9 text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus={isOpen}
            />
          </div>

          <div className="flex flex-col space-y-2 pt-2 pb-8">
            {filteredChats.length === 0 && (
              <span className="text-muted-foreground text-sm">No chat history found.</span>
            )}
            {filteredChats.map((chat) => (
              <div key={chat._id} className="space-y-1.5">
                {editingId === chat._id ? (
                  <div className="bg-accent flex items-center justify-between rounded-lg px-2 py-2.5">
                    <form
                      className="flex w-full items-center justify-between"
                      onSubmit={e => { e.preventDefault(); handleSaveEdit(chat._id, editTitle); }}
                    >
                      <Input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
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
                          onClick={() => setEditingId(null)} type="button">
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
                        <span className="text-destructive text-sm font-medium ml-1 mt-0.5">Delete chat?</span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive size-8"
                            onClick={e => { e.preventDefault(); handleConfirmDelete(chat._id); }}
                            type="button"
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground size-8"
                            onClick={e => { e.preventDefault(); setDeletingId(null); }}
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
                          <span className="line-clamp-1 text-base font-normal">
                            {chat.title}
                          </span>
                          <span className="mr-2 text-xs font-normal text-gray-500">
                            {(chat.updatedAt || chat._creationTime)
                              ? new Date(chat.updatedAt || chat._creationTime).toLocaleDateString()
                              : "Unknown Date"}
                          </span>
                        </Link>
                        <div className="flex items-center">
                          <div className="hidden group-hover:flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground size-8"
                              onClick={e => { e.preventDefault(); setEditingId(chat._id); setEditTitle(chat.title || ""); }}
                              type="button"
                            >
                              <PencilSimple className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive size-8"
                              onClick={e => { e.preventDefault(); setDeletingId(chat._id); }}
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
        </div>
      </aside>
      <CommandDialog
        open={showFloatingSearch}
        onOpenChange={(open) => {
          setShowFloatingSearch(open);
          if (!open) {
            setFloatingSearchQuery("");
            setFloatingEditingId(null);
            setFloatingEditTitle("");
            setFloatingDeletingId(null);
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
            <CommandGroup className="p-1.5">
              {floatingFilteredChats.map((chat) => (
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
                          onChange={(e) => setFloatingEditTitle(e.target.value)}
                          className="h-8 flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              handleFloatingCancelEdit();
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
                        <span className="text-destructive text-sm px-2">Confirm delete?</span>
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
                          router.replace(`/c/${chat._id}`, {scroll: false})
                          setShowFloatingSearch(false) // Close dialog on selection
                        }
                      }}
                      className={cn(
                        "group hover:bg-accent! flex w-full items-center justify-between rounded-md data-[selected=true]:bg-transparent",
                        Boolean(floatingEditingId || floatingDeletingId) &&
                        "hover:bg-transparent! data-[selected=true]:bg-transparent"
                      )}
                      value={chat.title || "Untitled Chat"}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-base font-normal">
                          {chat?.title || "Untitled Chat"}
                        </span>
                      </div>

                      <div className="relative flex min-w-[120px] flex-shrink-0 justify-end">
                        <span
                          className={cn(
                            "text-muted-foreground text-base font-normal transition-opacity duration-0 group-hover:opacity-0",
                            Boolean(floatingEditingId || floatingDeletingId) &&
                            "group-hover:opacity-100"
                          )}
                        >
                          {(chat?.updatedAt || chat?._creationTime)
                            ? new Date(chat.updatedAt || chat._creationTime).toLocaleDateString()
                            : "No date"}
                        </span>

                        <div
                          className={cn(
                            "absolute inset-0 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-0 group-hover:opacity-100",
                            Boolean(floatingEditingId || floatingDeletingId) &&
                            "group-hover:opacity-0"
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
                              if (chat?._id) handleFloatingDelete(chat._id)
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
    </div>
  )
}

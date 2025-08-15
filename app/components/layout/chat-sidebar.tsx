'use client';

import { convexQuery } from '@convex-dev/react-query';
import { MagnifyingGlass, Plus, SidebarSimple } from '@phosphor-icons/react';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { useMutation } from 'convex/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { memo, useCallback, useMemo, useState } from 'react';
import { useChatSession } from '@/app/providers/chat-session-provider';
import { useSidebar } from '@/app/providers/sidebar-provider';
import { useUser } from '@/app/providers/user-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import {
  getOrderedGroupKeys,
  groupChatsByTime,
  hasChatsInGroup,
} from '@/lib/chat-utils/time-grouping';
import { APP_NAME } from '@/lib/config';
import { ChatList } from './chat-list';

// Helper function for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(' ');

const ChatSidebar = memo(function SidebarComponent() {
  const { isSidebarOpen: isOpen, toggleSidebar } = useSidebar();
  const { data: chatsQuery = [], isLoading: chatsLoading } = useTanStackQuery({
    ...convexQuery(api.chats.listChatsForUser, {}),
    // Extended cache for chat list to prevent flickering
    gcTime: 20 * 60 * 1000, // 20 minutes
  });
  const updateChatTitle = useMutation(api.chats.updateChatTitle);
  const deleteChat = useMutation(api.chats.deleteChat);
  const pinChatToggle = useMutation(api.chats.pinChatToggle);
  const { setIsDeleting: setChatIsDeleting, chatId: activeChatId } =
    useChatSession();
  const { user } = useUser();

  const router = useRouter();
  const pathname = usePathname();

  // State for search and edit/delete in the main sidebar list
  const [searchQuery, setSearchQuery] = useState('');

  // Memoize search input handler
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  // Memoize search button handler
  const handleSearchButtonClick = useCallback(() => {
    if (!isOpen) {
      window.dispatchEvent(new Event('openCommandHistory'));
    }
  }, [isOpen]);

  // Memoize new chat button handler
  const handleNewChatClick = useCallback(() => {
    router.push('/');
  }, [router]);

  // Memoize conditional new chat button handler
  const handleConditionalNewChatClick = useCallback(() => {
    if (pathname !== '/') {
      router.push('/');
    }
  }, [pathname, router]);

  // Memoize conditional tasks button handler
  const handleConditionalTasksClick = useCallback(() => {
    if (pathname !== '/tasks') {
      router.push('/tasks');
    }
  }, [pathname, router]);

  // Use chats directly from query (already memoized by TanStack Query)
  const chats = chatsQuery;

  // --- Handlers for main sidebar list ---
  const handleSaveEdit = useCallback(
    async (id: Id<'chats'>, newTitle: string) => {
      await updateChatTitle({ chatId: id, title: newTitle });
    },
    [updateChatTitle]
  );

  const handleConfirmDelete = useCallback(
    async (id: Id<'chats'>) => {
      // Get current chatId at execution time instead of capturing in dependency
      const isCurrentChat = activeChatId === id;
      if (isCurrentChat) {
        // Signal to the active Chat component that we are deleting it so it can
        // suppress the "Chat not found" toast during the brief race condition
        // between the mutation completing and the route change finishing.
        setChatIsDeleting(true);
      }

      try {
        await deleteChat({ chatId: id });

        if (isCurrentChat) {
          router.push('/');
          // We intentionally do NOT reset `isDeleting` here. The
          // ChatSessionProvider will automatically clear this flag when the route
          // (and therefore the chatId) changes, ensuring the flag remains set
          // long enough for the Chat component to unmount and preventing a false
          // "Chat not found" error toast.
        }
      } catch (err) {
        // Roll back deletion flag on error so UI interactions are not blocked.
        if (isCurrentChat) {
          setChatIsDeleting(false);
        }
        throw err;
      }
    },
    [activeChatId, deleteChat, router, setChatIsDeleting]
  );

  const handleTogglePin = useCallback(
    async (id: Id<'chats'>) => {
      await pinChatToggle({ chatId: id });
    },
    [pinChatToggle]
  );

  // Memoize filtered chats with early return for empty arrays
  const filteredChats = useMemo(() => {
    if (!chats?.length) {
      return [];
    }
    if (!searchQuery.trim()) {
      return chats;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return chats.filter((chat) =>
      (chat.title || '').toLowerCase().includes(lowerQuery)
    );
  }, [chats, searchQuery]);

  // Memoize pinned and unpinned chats with optimized single-pass separation
  const { pinnedChats, unpinnedChats } = useMemo(() => {
    if (!filteredChats.length) {
      return { pinnedChats: [], unpinnedChats: [] };
    }

    const pinned: Doc<'chats'>[] = [];
    const unpinned: Doc<'chats'>[] = [];

    // Single pass through the array instead of two filter operations
    for (const chat of filteredChats) {
      if (chat.isPinned) {
        pinned.push(chat);
      } else {
        unpinned.push(chat);
      }
    }

    return { pinnedChats: pinned, unpinnedChats: unpinned };
  }, [filteredChats]);

  // Memoize grouped chats and ordered group keys
  const { groupedChats, orderedGroupKeys } = useMemo(() => {
    const grouped = groupChatsByTime(unpinnedChats);
    const ordered = getOrderedGroupKeys();
    return { groupedChats: grouped, orderedGroupKeys: ordered };
  }, [unpinnedChats]);

  return (
    <div className="z-51 hidden md:block">
      {/* Fixed collapse button with animated extra buttons (always same size/position) */}
      <div className="fixed top-4 left-4 z-[60] flex flex-row items-center">
        <button
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className={
            'group flex items-center justify-center rounded-full border border-transparent bg-background/80 p-2 shadow-lg outline-none backdrop-blur transition-all duration-300 hover:bg-accent focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-muted-foreground/20 dark:bg-muted/80'
          }
          onClick={toggleSidebar}
          tabIndex={0}
          type="button"
        >
          <SidebarSimple
            className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
            weight="bold"
          />
        </button>
        {/* Animated search and new chat buttons in collapsed state only */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label="Search"
              className={`group ml-1 flex items-center justify-center rounded-full p-2 outline-none transition-[transform,opacity] duration-300 ease-in-out hover:bg-accent focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isOpen ? '-translate-x-2 pointer-events-none scale-50 opacity-0' : 'translate-x-0 scale-100 opacity-100'}`}
              onClick={handleSearchButtonClick}
              style={{ transitionDelay: isOpen ? '0ms' : '100ms' }}
              tabIndex={isOpen ? -1 : 0}
              type="button"
            >
              <MagnifyingGlass
                className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
                weight="bold"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>
        {!(pathname === '/' && !isOpen) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label="New chat"
                className={`group ml-1 flex items-center justify-center rounded-full p-2 outline-none transition-[transform,opacity] duration-300 ease-in-out hover:bg-accent focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isOpen ? '-translate-x-2 pointer-events-none scale-50 opacity-0' : 'translate-x-0 scale-100 opacity-100'}`}
                onClick={handleNewChatClick}
                style={{ transitionDelay: isOpen ? '0ms' : '200ms' }}
                tabIndex={isOpen ? -1 : 0}
                type="button"
              >
                <Plus
                  className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
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
          'flex h-dvh flex-col border-muted-foreground/10 border-r bg-background shadow-lg',
          isOpen ? 'w-64' : 'hidden w-0',
          'transition-[width,transform] duration-300 ease-in-out'
        )}
      >
        <div className="flex h-[60px] shrink-0 items-center justify-center pt-1">
          <Link
            className="font-medium text-lg lowercase tracking-tight"
            href="/"
            prefetch
          >
            {APP_NAME}
          </Link>
        </div>

        {/* Fixed Action Buttons Section - New Chat, Tasks, Search */}
        <div
          className={cn(
            'flex shrink-0 flex-col gap-3 px-4 pt-4 pb-0',
            'transition-opacity duration-300 ease-in-out',
            isOpen ? 'opacity-100 delay-150' : 'opacity-0'
          )}
        >
          <Button
            className="h-9 w-full justify-center font-bold text-sm"
            onClick={handleConditionalNewChatClick}
            variant="outline"
          >
            New Chat
          </Button>

          {/* Only show Tasks button for logged-in users */}
          {user && !user.isAnonymous && (
            <Button
              className="h-9 w-full justify-center font-bold text-sm"
              onClick={handleConditionalTasksClick}
              variant="outline"
            >
              Tasks
            </Button>
          )}

          <div className="relative">
            <MagnifyingGlass className="-translate-y-1/2 absolute top-1/2 left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus={isOpen}
              className="h-9 w-full pl-8 text-sm"
              onChange={handleSearchChange}
              placeholder="Search chats..."
              type="search"
              value={searchQuery}
            />
          </div>
        </div>

        {/* Scrollable Chat List Section */}
        <div
          className={cn(
            'flex flex-grow flex-col overflow-y-auto px-4 pt-4 pb-4',
            'transition-opacity duration-300 ease-in-out',
            isOpen ? 'opacity-100 delay-150' : 'opacity-0'
          )}
        >
          {chatsLoading && chats.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  className="h-8 animate-pulse rounded bg-muted/50"
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items don't change
                  key={i}
                />
              ))}
            </div>
          ) : (
            <ChatList
              activeChatId={activeChatId}
              groupedChats={groupedChats}
              handleConfirmDelete={handleConfirmDelete}
              handleSaveEdit={handleSaveEdit}
              handleTogglePin={handleTogglePin}
              hasChatsInGroup={hasChatsInGroup}
              orderedGroupKeys={orderedGroupKeys}
              pinnedChats={pinnedChats}
            />
          )}
        </div>
      </aside>
    </div>
  );
});

export default ChatSidebar;

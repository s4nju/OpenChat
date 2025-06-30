'use client';

import { PushPinSimpleIcon } from '@phosphor-icons/react';
import { memo, useMemo } from 'react';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import type { TimeGroup } from '@/lib/chat-utils/time-grouping';
import { ChatItem } from './chat-item';

// Helper function for conditional classes

interface ChatListProps {
  pinnedChats: Doc<'chats'>[];
  groupedChats: Record<string, Doc<'chats'>[]>;
  orderedGroupKeys: TimeGroup[];
  handleSaveEdit: (id: Id<'chats'>, title: string) => void;
  handleConfirmDelete: (id: Id<'chats'>) => void;
  handleTogglePin: (id: Id<'chats'>) => void;
  hasChatsInGroup: (
    groupedChats: Record<string, Doc<'chats'>[]>,
    groupKey: TimeGroup
  ) => boolean;
}

export const ChatList = memo(function ChatListComponent({
  pinnedChats,
  groupedChats,
  orderedGroupKeys,
  handleSaveEdit,
  handleConfirmDelete,
  handleTogglePin,
  hasChatsInGroup,
}: ChatListProps) {
  // Pre-compute chat lookup map for O(1) access instead of O(n) searches
  const chatLookupMap = useMemo(() => {
    const map = new Map<Id<'chats'>, string>();

    // Add pinned chats to the map
    for (const chat of pinnedChats) {
      if (chat.title) {
        map.set(chat._id, chat.title);
      }
    }

    // Add grouped chats to the map
    for (const chat of Object.values(groupedChats).flat()) {
      if (chat.title) {
        map.set(chat._id, chat.title);
      }
    }

    return map;
  }, [pinnedChats, groupedChats]);

  // Helper function to get parent chat title for reuse across both sections
  const getParentChatTitle = (
    originalChatId: Id<'chats'> | undefined
  ): string | undefined => {
    return originalChatId ? chatLookupMap.get(originalChatId) : undefined;
  };

  return (
    <div className="flex flex-col pt-2 pb-8">
      {pinnedChats.length === 0 && Object.keys(groupedChats).length === 0 && (
        <span className="px-1.5 text-muted-foreground text-sm">
          No chat history found.
        </span>
      )}
      {/* Pinned Chats Section */}
      {pinnedChats.length > 0 && (
        <div className="relative flex w-full min-w-0 flex-col">
          <h3 className="flex h-8 shrink-0 select-none items-center rounded-md px-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <PushPinSimpleIcon className="mr-1 h-3 w-3" />
            Pinned
          </h3>
          <ul className="flex w-full min-w-0 flex-col gap-1 text-sm">
            {pinnedChats.map((chat) => (
              <ChatItem
                handleConfirmDelete={handleConfirmDelete}
                handleSaveEdit={handleSaveEdit}
                handleTogglePin={handleTogglePin}
                id={chat._id}
                isPinned={true}
                key={chat._id}
                originalChatId={chat.originalChatId}
                parentChatTitle={getParentChatTitle(chat.originalChatId)}
                title={chat.title}
              />
            ))}
          </ul>
        </div>
      )}
      {orderedGroupKeys.map(
        (groupKey) =>
          hasChatsInGroup(groupedChats, groupKey) && (
            <div
              className="relative flex w-full min-w-0 flex-col"
              key={groupKey}
            >
              <h3 className="flex h-8 shrink-0 select-none items-center rounded-md px-1.5 pt-8 pb-4 font-medium text-muted-foreground text-xs uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {groupKey}
              </h3>
              <ul className="flex w-full min-w-0 flex-col gap-1 text-sm">
                {groupedChats[groupKey].map((chat) => (
                  <ChatItem
                    handleConfirmDelete={handleConfirmDelete}
                    handleSaveEdit={handleSaveEdit}
                    handleTogglePin={handleTogglePin}
                    id={chat._id}
                    isPinned={false}
                    key={chat._id}
                    originalChatId={chat.originalChatId}
                    parentChatTitle={getParentChatTitle(chat.originalChatId)}
                    title={chat.title}
                  />
                ))}
              </ul>
            </div>
          )
      )}
    </div>
  );
});

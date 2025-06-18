"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { TimeGroup } from "@/lib/chat-utils/time-grouping"
import {
  Check,
  GitBranch,
  PencilSimple,
  PushPinSimple,
  PushPinSimpleSlash,
  TrashSimple,
  X,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ChatItem } from "./ChatItem"

// Helper function for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(" ")

interface ChatListProps {
  pinnedChats: Doc<"chats">[]
  groupedChats: Record<string, Doc<"chats">[]>
  orderedGroupKeys: TimeGroup[]
  handleSaveEdit: (id: Id<"chats">, title: string) => void
  handleConfirmDelete: (id: Id<"chats">) => void
  handleTogglePin: (id: Id<"chats">) => void
  hasChatsInGroup: (
    groupedChats: Record<string, Doc<"chats">[]>,
    groupKey: TimeGroup
  ) => boolean
}

export function ChatList({
  pinnedChats,
  groupedChats,
  orderedGroupKeys,
  handleSaveEdit,
  handleConfirmDelete,
  handleTogglePin,
  hasChatsInGroup,
}: ChatListProps) {
  const params = useParams<{ chatId?: string }>()
  const router = useRouter()

  return (
    <div className="flex flex-col pt-2 pb-8">
      {pinnedChats.length === 0 && Object.keys(groupedChats).length === 0 && (
        <span className="text-muted-foreground px-1.5 text-sm">
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
              <ChatItem
                key={chat._id}
                id={chat._id}
                title={chat.title}
                originalChatId={chat.originalChatId}
                parentChatTitle={
                  chat.originalChatId
                    ? pinnedChats.find((c) => c._id === chat.originalChatId)
                        ?.title ??
                      Object.values(groupedChats)
                        .flat()
                        .find((c) => c._id === chat.originalChatId)?.title
                    : undefined
                }
                handleSaveEdit={handleSaveEdit}
                handleConfirmDelete={handleConfirmDelete}
                handleTogglePin={handleTogglePin}
                isPinned={true}
              />
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
              <h3 className="text-muted-foreground focus-visible:ring-primary flex h-8 shrink-0 items-center rounded-md px-1.5 text-xs font-medium tracking-wider uppercase outline-none select-none focus-visible:ring-2">
                {groupKey}
              </h3>
              <ul className="flex w-full min-w-0 flex-col gap-1 text-sm">
                {groupedChats[groupKey].map((chat) => (
                  <ChatItem
                    key={chat._id}
                    id={chat._id}
                    title={chat.title}
                    originalChatId={chat.originalChatId}
                    parentChatTitle={
                      chat.originalChatId
                        ? pinnedChats.find((c) => c._id === chat.originalChatId)
                            ?.title ??
                          Object.values(groupedChats)
                            .flat()
                            .find((c) => c._id === chat.originalChatId)?.title
                        : undefined
                    }
                    handleSaveEdit={handleSaveEdit}
                    handleConfirmDelete={handleConfirmDelete}
                    handleTogglePin={handleTogglePin}
                    isPinned={false}
                  />
                ))}
              </ul>
            </div>
          )
      )}
    </div>
  )
}

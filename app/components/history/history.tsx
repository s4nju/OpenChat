"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useChats } from "@/lib/chat-store/chats/provider"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import { HistoryTrigger } from "@/app/components/history/history-trigger"

const CommandHistory = dynamic(
  () => import("./command-history").then((mod) => mod.CommandHistory),
  { ssr: false }
)

const DrawerHistory = dynamic(
  () => import("./drawer-history").then((mod) => mod.DrawerHistory),
  { ssr: false }
)

export function History() {
  const isMobile = useBreakpoint(768)
  const params = useParams<{ chatId: string }>()
  const router = useRouter()
  const { chats, updateTitle, deleteChat } = useChats()

  const handleSaveEdit = async (id: string, newTitle: string) => {
    try {
      await updateTitle(id, newTitle)
    } catch (error) {
      console.error("Failed to update chat title:", error)
      // Optionally, show user feedback here
    }
  }

  const handleConfirmDelete = async (id: string) => {
    try {
      await deleteChat(id, params.chatId, () => router.push("/"))
    } catch (error) {
      console.error("Failed to delete chat:", error)
      // Optionally, show user feedback here
    }
  }

  return (
    <HistoryTrigger
      chatHistory={chats}
      onSaveEdit={handleSaveEdit}
      onConfirmDelete={handleConfirmDelete}
    />
  )
}

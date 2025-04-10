"use client"
import { HistoryTrigger } from "@/app/components/history/history-trigger"
import { AppInfoTrigger } from "@/app/components/layout/app-info/app-info-trigger"
import { UserMenu } from "@/app/components/layout/user-menu"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useUser } from "@/app/providers/user-provider"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { APP_NAME } from "../../../lib/config"
import { ButtonNewChat } from "./button-new-chat"
import ThemeSwitchIcon from "./ThemeSwitchIcon"
import { Info } from "@phosphor-icons/react"

export function Header() {
  const { user } = useUser()
  const params = useParams<{ chatId?: string }>()
  const router = useRouter()
  const { chats, updateTitle, deleteChat } = useChats()
  const isLoggedIn = !!user

  const handleSaveEdit = async (id: string, newTitle: string) => {
    await updateTitle(id, newTitle)
  }

  const handleConfirmDelete = async (id: string) => {
    await deleteChat(id, params.chatId, () => router.push("/"))
  }

  return (
    <header className="h-app-header fixed top-0 right-0 left-0 z-50">
      <div className="h-app-header top-app-header bg-background pointer-events-none absolute left-0 z-50 mx-auto w-full to-transparent backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)] lg:hidden"></div>
      <div className="bg-background relative mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <Link
          href="/"
          prefetch
          className="text-xl font-medium tracking-tight lowercase"
        >
          {APP_NAME}
        </Link>
        {!isLoggedIn ? (
          <div className="flex items-center gap-4">
            <AppInfoTrigger
              trigger={
                <button
                  type="button"
                  className="group flex items-center justify-center rounded-full p-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-full outline-none"
                  aria-label={`About ${APP_NAME}`}
                  tabIndex={0}
                >
                  <Info className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" weight="bold" />
                </button>
              }
            />
            <ThemeSwitchIcon />
            <Link
              href="/auth"
              className="font-base text-muted-foreground hover:text-foreground text-base transition-colors"
            >
              Login
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ButtonNewChat />
            <HistoryTrigger
              chatHistory={chats}
              onSaveEdit={handleSaveEdit}
              onConfirmDelete={handleConfirmDelete}
            />
            <ThemeSwitchIcon />
            <UserMenu user={user} />
          </div>
        )}
      </div>
    </header>
  )
}

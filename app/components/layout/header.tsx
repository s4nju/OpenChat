"use client"
import { HistoryTrigger } from "@/app/components/history/history-trigger"
import { AppInfoTrigger } from "@/app/components/layout/app-info/app-info-trigger"
import { UserMenu } from "@/app/components/layout/user-menu"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useUser } from "@/app/providers/user-provider"
import Link from "next/link"
import { useParams, useRouter, usePathname } from "next/navigation"
import { ButtonNewChat } from "./button-new-chat"
import ThemeSwitchIcon from "./ThemeSwitchIcon"
import { Info, Plus, ListMagnifyingGlass } from "@phosphor-icons/react"
import { APP_NAME } from "@/lib/config"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function Header() {
  const { user } = useUser()
  const params = useParams<{ chatId?: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const { chats, updateTitle, deleteChat } = useChats()
  const isLoggedIn = !!user
  const isMobile = useBreakpoint(768)

  const handleSaveEdit = async (id: string, newTitle: string) => {
    await updateTitle(id, newTitle)
  }

  const handleConfirmDelete = async (id: string) => {
    await deleteChat(id, params.chatId, () => router.push("/"))
  }

  return (
    <header className="h-app-header fixed top-0 right-0 left-0 z-50">
      <div className="h-app-header top-app-header bg-background pointer-events-none absolute left-0 z-50 mx-auto w-full to-transparent backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)] lg:hidden"></div>
      <div className="bg-background relative mx-auto flex h-full items-center justify-between px-4 sm:px-6 lg:bg-transparent lg:px-8">
        {/* Logo on mobile */}
        <div className="flex items-center md:hidden">
          <Link
            href="/"
            prefetch
            className="text-lg font-medium tracking-tight lowercase"
          >
            {APP_NAME}
          </Link>
        </div>
        
        {/* Hidden placeholder to prevent layout shift on desktop */}
        <div className="w-24 hidden md:block"></div>
        
        {!isLoggedIn ? (
          <div className="flex items-center gap-4">
            <AppInfoTrigger
              trigger={
                <button
                  type="button"
                  className="group flex items-center justify-center rounded-full p-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-full outline-none"
                  aria-label={`About`}
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
            {/* Mobile buttons for new chat and search history */}
            {isMobile && (
              <>
                {pathname !== "/" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => router.push("/")}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
                        type="button"
                        aria-label="New Chat"
                      >
                        <Plus size={24} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>New Chat</TooltipContent>
                  </Tooltip>
                )}
                <HistoryTrigger
                  chatHistory={chats}
                  onSaveEdit={handleSaveEdit}
                  onConfirmDelete={handleConfirmDelete}
                />
              </>
            )}
            <ThemeSwitchIcon />
            <UserMenu user={user} />
          </div>
        )}
      </div>
    </header>
  )
}

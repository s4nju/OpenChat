"use client"

import { usePathname } from "next/navigation"
import {
  createContext,
  useContext,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from "react"

type ChatSessionContextType = {
  chatId: string | null
  isDeleting: boolean
  setIsDeleting: Dispatch<SetStateAction<boolean>>
}

const ChatSessionContext = createContext<ChatSessionContextType>({
  chatId: null,
  isDeleting: false,
  setIsDeleting: () => {},
})

export const useChatSession = () => useContext(ChatSessionContext)

export function ChatSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isDeleting, setIsDeleting] = useState(false)

  const chatId = useMemo(() => {
    if (pathname?.startsWith("/c/")) return pathname.split("/c/")[1]
    return null
  }, [pathname])

  // When the chat page changes, reset the deleting state
  // This handles cases where a user navigates away before a delete operation finishes
  // or if the state gets stuck.
  useMemo(() => {
    setIsDeleting(false)
  }, [chatId])

  const contextValue = useMemo(
    () => ({
      chatId,
      isDeleting,
      setIsDeleting,
    }),
    [chatId, isDeleting]
  )

  return (
    <ChatSessionContext.Provider value={contextValue}>
      {children}
    </ChatSessionContext.Provider>
  )
}

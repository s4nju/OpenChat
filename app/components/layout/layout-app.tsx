"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import ChatSidebar from "./ChatSidebar"
import { Header } from "./header"

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()

  // Load sidebar state from localStorage on initial mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarOpen")
    if (savedState !== null) {
      setIsSidebarOpen(savedState === "true")
    }
  }, [])

  const toggleSidebar = () => {
    const newState = !isSidebarOpen
    setIsSidebarOpen(newState)
    localStorage.setItem("sidebarOpen", String(newState))
  }

  // Keyboard shortcuts: Cmd+Shift+O for new chat, Cmd+B to toggle sidebar, Cmd+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const isMeta = e.metaKey || e.ctrlKey

      // Handle Cmd+K globally (even when inputs are focused)
      if (isMeta && key === "k") {
        e.preventDefault()
        e.stopPropagation()
        window.dispatchEvent(new Event("toggleFloatingSearch"))
        return
      }

      // For other shortcuts, skip if focused on input elements
      const tag = (e.target as HTMLElement)?.tagName
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return

      if (isMeta && e.shiftKey && key === "o") {
        e.preventDefault()
        router.push("/")
      } else if (isMeta && !e.shiftKey && key === "b") {
        e.preventDefault()
        toggleSidebar()
      }
    }
    document.addEventListener("keydown", handler, true)
    return () => document.removeEventListener("keydown", handler, true)
  }, [router, toggleSidebar])

  return (
    // Main flex container
    <div className="bg-background flex h-screen overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header is fixed, overlays this div */}
        <Header />
        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "./header"
import ChatSidebar from "./ChatSidebar"

export default function LayoutApp({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  // Load sidebar state from localStorage on initial mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) {
      setIsSidebarOpen(savedState === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', String(newState));
  };

  // Keyboard shortcuts: Cmd+Shift+O for new chat, Cmd+B to toggle sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      const key = e.key.toLowerCase()
      const isMeta = e.metaKey || e.ctrlKey
      if (isMeta && e.shiftKey && key === 'o') {
        e.preventDefault();
        router.push('/');
      } else if (isMeta && !e.shiftKey && key === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (isMeta && key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new Event('toggleFloatingSearch'));
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router, toggleSidebar]);

  return (
    // Main flex container
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <ChatSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden"> 
        {/* Header is fixed, overlays this div */}
        <Header />
        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto"> 
          {children}
        </main>
      </div>
    </div>
  )
}

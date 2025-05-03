"use client"

import { useState, useEffect } from "react"
import { Header } from "./header"
import ChatSidebar from "./ChatSidebar"

export default function LayoutApp({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

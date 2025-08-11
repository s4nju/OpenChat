'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarOpen');
      return savedState !== null ? savedState === 'true' : false;
    }
    return false;
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebarOpen', String(newState));
      return newState;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

import { create } from 'zustand';

interface UIState {
  // State
  isSidebarCollapsed: boolean;
  mobileSheetOpen: boolean;
  isMobile: boolean;
  
  // Actions
  setIsSidebarCollapsed: (isCollapsed: boolean) => void;
  setMobileSheetOpen: (isOpen: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  
  // Operations
  toggleSidebar: () => void;
  toggleMobileSheet: () => void;
  
  // Initialization
  initializeSidebarState: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // State
  isSidebarCollapsed: false,
  mobileSheetOpen: false,
  isMobile: false,
  
  // Actions
  setIsSidebarCollapsed: (isCollapsed) => {
    set({ isSidebarCollapsed: isCollapsed });
    localStorage.setItem("sidebar_collapsed", String(isCollapsed));
  },
  setMobileSheetOpen: (isOpen) => set({ mobileSheetOpen: isOpen }),
  setIsMobile: (isMobile) => set({ isMobile }),
  
  // Operations
  toggleSidebar: () => {
    const { isSidebarCollapsed, setIsSidebarCollapsed } = get();
    setIsSidebarCollapsed(!isSidebarCollapsed);
  },
  toggleMobileSheet: () => {
    set((state) => ({ mobileSheetOpen: !state.mobileSheetOpen }));
  },
  
  // Initialization
  initializeSidebarState: () => {
    const { isMobile } = get();
    const storedCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
    
    // Prioritize mobile: if mobile, collapse. Otherwise, use stored value.
    set({ isSidebarCollapsed: isMobile ? true : storedCollapsed });
  }
})); 
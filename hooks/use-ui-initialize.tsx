import { useEffect } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useUIStore } from "@/lib/stores/ui-store"

/**
 * Custom hook that handles UI initialization based on mobile detection
 * Extracts this logic from components to make them cleaner
 */
export function useUIInitialize() {
  const isMobileDetected = useIsMobile()
  const { setIsMobile, initializeSidebarState } = useUIStore()
  
  useEffect(() => {
    if (isMobileDetected !== undefined) {
      setIsMobile(isMobileDetected)
      initializeSidebarState()
    }
  }, [isMobileDetected, setIsMobile, initializeSidebarState])
  
  return {
    isMobile: isMobileDetected
  }
} 
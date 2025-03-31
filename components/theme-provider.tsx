// components/theme-provider.tsx
'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Ensure it's mounted before rendering to avoid hydration mismatch
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render nothing or a placeholder on the server/before mount
    // This helps prevent hydration errors with theme switching
    return null // Or <>{children}</> if you prefer initial render without theme
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

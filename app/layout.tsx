// app/layout.tsx
import type React from "react"
import "./globals.css" // Make sure this imports the updated globals.css
import type { Metadata, Viewport } from "next" // Import Viewport
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider" // Ensure this path is correct
import { SettingsProvider } from "@/lib/contexts/settings-context"

const inter = Inter({ subsets: ["latin"] })

// Define viewport settings separately
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: "OpenChat", // Updated title
  description: "A secure client-side AI chat application using OpenRouter", // Keep description relevant
  // Viewport settings removed from here
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Remove overflow-hidden to rely on Sheet/Dialog scroll locking */}
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange // Good for theme switching without flashes
        >
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

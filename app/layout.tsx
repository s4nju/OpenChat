// app/layout.tsx
import type React from "react"
import "./globals.css" // Make sure this imports the updated globals.css
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider" // Ensure this path is correct

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OpenChat", // Updated title
  description: "A secure client-side AI chat application using OpenRouter", // Keep description relevant
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Add overflow-hidden to prevent body scroll when sidebar/sheet is open */}
      <body className={`${inter.className} overflow-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange // Good for theme switching without flashes
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ChatsProvider } from "@/lib/chat-store/chats/provider"
import { APP_DESCRIPTION, APP_NAME, APP_BASE_URL } from "@/lib/config"
import { ThemeProvider } from "./providers/theme-provider"
import Script from "next/script"
import { ChatSessionProvider } from "./providers/chat-session-provider"
import { LayoutClient } from "./layout-client"
import { UserProvider } from "./providers/user-provider"
import { ConvexClientProvider } from "./providers/ConvexClientProvider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  metadataBase: new URL(APP_BASE_URL),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isDev = process.env.NODE_ENV === "development"

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {!isDev && process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            strategy="afterInteractive"
            src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
        <LayoutClient />
        <ConvexClientProvider>
          <UserProvider initialUser={null}>
            <ChatsProvider userId={undefined}>
              <ChatSessionProvider>
                <ThemeProvider>
                  <Toaster position="top-center" />
                  {children}
                </ThemeProvider>
              </ChatSessionProvider>
            </ChatsProvider>
          </UserProvider>
        </ConvexClientProvider>
      </body>
    </html>
  )
}

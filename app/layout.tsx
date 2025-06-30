import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { BotIdClient } from 'botid/client';
import Script from 'next/script';
import { Toaster } from '@/components/ui/sonner';
import { APP_BASE_URL, APP_DESCRIPTION, APP_NAME } from '@/lib/config';
import { LayoutClient } from './layout-client';
import { ChatSessionProvider } from './providers/chat-session-provider';
import { ConvexClientProvider } from './providers/convex-client-provider';
import { CSPostHogProvider } from './providers/posthog-provider';
import { ThemeProvider } from './providers/theme-provider';
import { UserProvider } from './providers/user-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  metadataBase: new URL(APP_BASE_URL),
};

import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';

// Define the paths and HTTP methods that require BotID protection
const protectedRoutes = [
  { path: '/api/chat', method: 'POST' },
  { path: '/api/create-chat', method: 'POST' },
  { path: '/api/rate-limits', method: 'GET' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Mount BotID to protect critical routes from sophisticated bots */}
        <BotIdClient protect={protectedRoutes} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {!isDev &&
          process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL &&
          process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
            <Script
              data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
              src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
              strategy="afterInteractive"
            />
          )}
        <LayoutClient />
        <ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>
            <UserProvider>
              <CSPostHogProvider>
                <ChatSessionProvider>
                  <ThemeProvider>
                    <Toaster position="top-center" />
                    {children}
                  </ThemeProvider>
                </ChatSessionProvider>
              </CSPostHogProvider>
            </UserProvider>
          </ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}

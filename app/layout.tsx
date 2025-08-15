import type { Metadata } from 'next';
import {
  Architects_Daughter,
  Atkinson_Hyperlegible,
  Atkinson_Hyperlegible_Mono,
  Fira_Mono,
  Geist,
  Geist_Mono,
  Inter,
  JetBrains_Mono,
  Open_Sans,
  Space_Grotesk,
} from 'next/font/google';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import { APP_BASE_URL, APP_DESCRIPTION, APP_NAME } from '@/lib/config';
import { cn } from '@/lib/utils';
import { AuthGuard } from './components/auth/auth-guard';
import { LayoutClient } from './layout-client';
import { ConvexClientProvider } from './providers/convex-client-provider';
import { SidebarProvider } from './providers/sidebar-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const firaMono = Fira_Mono({
  variable: '--font-fira-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: '--font-atkinson-hyperlegible',
  subsets: ['latin'],
  weight: ['400', '700'],
});

const atkinsonHyperlegibleMono = Atkinson_Hyperlegible_Mono({
  variable: '--font-atkinson-hyperlegible-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
  fallback: ['Atkinson Hyperlegible Mono', 'monospace'],
});

const architectsDaughter = Architects_Daughter({
  variable: '--font-architects-daughter',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  metadataBase: new URL(APP_BASE_URL),
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: APP_BASE_URL,
    siteName: APP_NAME,
    images: [
      {
        url: '/opengraph-image.jpg',
        width: 1200,
        height: 630,
        alt: APP_DESCRIPTION,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ['/opengraph-image.jpg'],
  },
};

import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          'font-sans antialiased',
          geistSans.variable,
          geistMono.variable,
          inter.variable,
          spaceGrotesk.variable,
          firaMono.variable,
          openSans.variable,
          jetbrainsMono.variable,
          atkinsonHyperlegible.variable,
          atkinsonHyperlegibleMono.variable,
          architectsDaughter.variable
        )}
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
            <AuthGuard>
              <SidebarProvider>{children}</SidebarProvider>
              <Analytics />
              <SpeedInsights />
            </AuthGuard>
          </ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}

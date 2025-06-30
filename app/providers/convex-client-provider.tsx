'use client';
import { ConvexAuthNextjsProvider } from '@convex-dev/auth/nextjs';
import { ConvexReactClient } from 'convex/react';

// Validate environment variable early for clearer error messaging
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    'Environment variable NEXT_PUBLIC_CONVEX_URL is missing. Please set it in your environment to the URL of your Convex deployment.'
  );
}

const client = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsProvider client={client}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}

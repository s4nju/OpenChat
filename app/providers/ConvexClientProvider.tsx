"use client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";

const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return <ConvexAuthNextjsProvider client={client}>{children}</ConvexAuthNextjsProvider>;
}

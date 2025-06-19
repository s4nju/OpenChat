"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

// Nav items are static; declare once to avoid recreation per render
const NAV_ITEMS = [
  { name: "Account", href: "/settings" },
  { name: "Customization", href: "/settings/customization" },
  { name: "History & Sync", href: "/settings/history" },
  { name: "API Keys", href: "/settings/api-keys" },
  { name: "Attachments", href: "/settings/attachments" },
] as const;

function SettingsNavComponent() {
  const pathname = usePathname()


  return (
    <nav className="mb-8">
      <ul className="flex flex-nowrap space-x-1 overflow-x-auto md:overflow-x-visible whitespace-nowrap rounded-lg bg-muted p-1">
        {NAV_ITEMS.map(item => (
          <li key={item.href} className="shrink-0 md:flex-1">
            <Link
              href={item.href}
              className={cn(
                "block rounded-md px-4 py-2 text-center text-sm font-medium",
                ((item.href === "/settings" && (pathname === "/settings" || pathname === "/settings/")) ||
                  (item.href !== "/settings" && pathname.startsWith(item.href)))
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export const SettingsNav = React.memo(SettingsNavComponent);

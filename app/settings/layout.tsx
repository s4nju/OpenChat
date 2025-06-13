"use client"

import { HeaderGoBack } from "@/app/components/header-go-back"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const navItems = [
    { name: "Account", href: "/settings" },
    { name: "Customization", href: "/settings/customization" },
    { name: "History", href: "/settings/history" },
    { name: "Attachments", href: "/settings/attachments" },
    { name: "Contact Us", href: "/settings/contact" },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <HeaderGoBack href="/" />
      <nav className="border-border border-b">
        <div className="mx-auto max-w-xl px-6">
          <ul className="flex space-x-4">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block py-3 text-sm",
                    pathname === item.href
                      ? "border-primary text-foreground border-b-2 font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  )
}

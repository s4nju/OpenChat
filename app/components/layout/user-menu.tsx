"use client"

import { Doc } from "../../../convex/_generated/dataModel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import React from "react"
import { Eye, EyeSlash } from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { User, SignOut } from "@phosphor-icons/react"
// import dynamic from "next/dynamic"
// import { APP_NAME } from "../../../lib/config"
import { AppInfoTrigger } from "./app-info/app-info-trigger"
import { SettingsTrigger } from "./settings/settings-trigger"
import { useUser } from "@/app/providers/user-provider"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"

type User = Doc<"users">

export function UserMenu({ user }: { user: User }) {
  const { signOut } = useUser()
  const router = useRouter()

  const [showEmail, setShowEmail] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("showEmail") === "true"
  })

  const maskEmail = (email?: string) => {
    if (!email) return ""
    const [local, domain] = email.split("@")
    const tld = domain.substring(domain.lastIndexOf("."))
    const prefix = local.slice(0, 2)
    return `${prefix}*****${tld}`
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({ title: "Logged out", status: "success" })
      router.push("/")
    } catch (e) {
      console.error("Sign out failed:", e)
      toast({ title: "Failed to sign out", status: "error" })
    }
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarImage src={user?.image ?? undefined} />
              <AvatarFallback>
                {user?.name?.charAt(0) || (user?.email ? user.email.charAt(0) : "")}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Profile</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        className="w-56"
        align="end"
        forceMount
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem className="flex flex-col items-start gap-0 no-underline hover:bg-transparent focus:bg-transparent">
          <span>{user?.name}</span>
          <button onClick={() => {
            setShowEmail(prev => {
              localStorage.setItem("showEmail", (!prev).toString())
              return !prev
            })
          }} className="text-muted-foreground flex items-center gap-1">
            <span>{showEmail ? user?.email : maskEmail(user?.email)}</span>
            {showEmail ? <EyeSlash size={14} /> : <Eye size={14} />}
          </button>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
          <SettingsTrigger isMenuItem={true} />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
          <AppInfoTrigger />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleSignOut(); }}>
          <SignOut className="mr-2 size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

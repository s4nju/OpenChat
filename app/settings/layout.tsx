"use client"

import { HeaderGoBack } from "@/app/components/header-go-back"
import { useUser } from "@/app/providers/user-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { SettingsSidebar } from "@/app/components/layout/settings/settings-sidebar"

export default function SettingsLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (user && user.isAnonymous) {
      router.replace("/")
    }
    if (!user) {
      router.replace("/")
    }
  }, [user])

  if (!user || user.isAnonymous) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center">
      <div className="w-full max-w-6xl">
        <HeaderGoBack href="/" />
      </div>
      <main className="flex w-full max-w-6xl flex-1 gap-4 p-4 md:flex-row md:p-8">
        <div className="hidden w-full space-y-8 md:block md:w-1/4">
          <SettingsSidebar />
        </div>
        <div className="w-full md:w-3/4 md:pl-12">{children}</div>
      </main>
    </div>
  )
}

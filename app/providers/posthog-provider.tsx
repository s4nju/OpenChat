"use client"
import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"
import { useEffect } from "react"
import { useUser } from "./user-provider"

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/ingest",
    ui_host: 'https://eu.posthog.com'
  })
}
export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider client={posthog}>
      <PostHogAuthWrapper>{children}</PostHogAuthWrapper>
    </PostHogProvider>
  )
}

function PostHogAuthWrapper({ children }: { children: React.ReactNode }) {
  const userInfo = useUser()

  useEffect(() => {
    if (userInfo.user) {
      posthog.identify(userInfo.user._id, {
        email: userInfo.user.email,
        name: userInfo.user.name,
        isAnonymous: userInfo.user.isAnonymous,
      })
    } else {
      posthog.reset()
    }
  }, [userInfo.user])

  return children
}

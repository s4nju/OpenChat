import { Button } from "@/components/ui/button"
import { GithubLogo, TwitterLogo } from "@phosphor-icons/react"
import Image from "next/image"

export function AppInfoContent() {
  return (
    <div className="flex w-full flex-col items-center p-4">
      <Image
        src="/openchat-logo.svg"
        alt="OpenChat logo"
        width={40}
        height={40}
        className="rounded-lg"
      />
      <p className="text-foreground mt-4 text-center text-sm font-medium">
        OpenChat
      </p>
      <p className="text-muted-foreground mb-4 text-center text-sm">
        AI chat application built with Vercel SDK, RSC, and Shadcn UI
      </p>
      <div className="flex w-full flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="w-full rounded-lg"
        >
          <a
            href="https://github.com/ajanraj/openchat"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubLogo className="mr-2 size-4" />
            Repository
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="w-full rounded-lg"
        >
          <a
            href="https://twitter.com/ajanraj25"
            target="_blank"
            rel="noopener noreferrer"
          >
            <TwitterLogo className="mr-2 size-4" />
            Twitter
          </a>
        </Button>
      </div>
    </div>
  )
} 
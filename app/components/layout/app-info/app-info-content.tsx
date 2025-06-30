import { GithubLogo, TwitterLogo } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
// import Image from "next/image"

export function AppInfoContent() {
  return (
    <div className="flex w-full flex-col items-center p-4">
      {/*
      <Image
        src="/openchat-logo.svg"
        alt="OpenChat logo"
        width={40}
        height={40}
        className="rounded-lg"
      />
      */}
      <p className="mt-4 text-center font-medium text-foreground text-sm">
        OpenChat
      </p>
      <p className="mb-4 text-center text-muted-foreground text-sm">
        AI chat application built with Vercel SDK, RSC, and Shadcn UI
      </p>
      <div className="flex w-full flex-col gap-2">
        <Button
          asChild
          className="w-full rounded-lg"
          size="sm"
          variant="outline"
        >
          <a
            href="https://github.com/ajanraj/openchat"
            rel="noopener noreferrer"
            target="_blank"
          >
            <GithubLogo className="mr-2 size-4" />
            Repository
          </a>
        </Button>
        <Button
          asChild
          className="w-full rounded-lg"
          size="sm"
          variant="outline"
        >
          <a
            href="https://twitter.com/ajanraj25"
            rel="noopener noreferrer"
            target="_blank"
          >
            <TwitterLogo className="mr-2 size-4" />
            Twitter
          </a>
        </Button>
      </div>
    </div>
  );
}

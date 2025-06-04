"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuthActions } from "@convex-dev/auth/react"
import { useState } from "react"

type DialogAuthProps = {
  open: boolean
  setOpen: (open: boolean) => void
}

export function DialogAuth({ open, setOpen }: DialogAuthProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signIn } = useAuthActions()

  const handleSignInWithGoogle = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await signIn("google")
    } catch (err: any) {
      console.error("Error signing in with Google:", err)
      setError(err.message || "An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogDescription className="sr-only">Authenticate with your account to access the chat application.</DialogDescription>
        <DialogHeader>
          <DialogTitle className="text-xl">
            You've reached the limit for today
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            Sign in below to increase your message limits.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        <DialogFooter className="mt-6 sm:justify-center">
          <Button
            variant="secondary"
            className="w-full text-base"
            size="lg"
            onClick={handleSignInWithGoogle}
            disabled={isLoading}
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google logo"
              width={20}
              height={20}
              className="mr-2 size-4"
            />
            <span>{isLoading ? "Connecting..." : "Continue with Google"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

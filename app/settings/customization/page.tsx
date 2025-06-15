"use client"

import { useUser } from "@/app/providers/user-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"
import { APP_NAME } from "@/lib/config"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function CustomizationPage() {
  const { user, updateUser } = useUser()
  const router = useRouter()

  const [preferredName, setPreferredName] = useState("")
  const [occupation, setOccupation] = useState("")
  const [traits, setTraits] = useState<string[]>([])
  const [about, setAbout] = useState("")
  const [traitInput, setTraitInput] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setPreferredName(user.preferredName || "")
      setOccupation(user.occupation || "")
      setTraits(user.traits ? user.traits.split(", ") : [])
      setAbout(user.about || "")
    }
  }, [user])

  useEffect(() => {
    if (user) {
      const initialTraits = user.traits ? user.traits.split(", ") : []
      const hasChanges =
        (user.preferredName || "") !== preferredName ||
        (user.occupation || "") !== occupation ||
        (initialTraits.join(", ") !== traits.join(", ")) ||
        (user.about || "") !== about
      setHasUnsavedChanges(hasChanges)
    }
  }, [user, preferredName, occupation, traits, about])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!hasUnsavedChanges) return
      const anchor = (e.target as HTMLElement).closest("a") as HTMLAnchorElement | null
      if (anchor && anchor.href && anchor.target !== "_blank") {
        const url = anchor.getAttribute("href") || anchor.href
        if (url && url.startsWith("/")) {
          e.preventDefault()
          document.activeElement instanceof HTMLElement && document.activeElement.blur()
          setTimeout(() => {
            setPendingUrl(url)
            setShowUnsavedChangesDialog(true)
          }, 0)
        }
      }
    }
    document.addEventListener("click", handleDocumentClick, true)
    return () => {
      document.removeEventListener("click", handleDocumentClick, true)
    }
  }, [hasUnsavedChanges])

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      if (hasUnsavedChanges) {
        setPendingUrl(url)
        setTimeout(() => setShowUnsavedChangesDialog(true), 0)
      }
    }

    // next/router still exposes events even in app router
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nextRouter = require("next/router").Router
    nextRouter.events.on("routeChangeStart", handleRouteChangeStart)

    return () => {
      nextRouter.events.off("routeChangeStart", handleRouteChangeStart)
    }
  }, [hasUnsavedChanges])

  const handleSave = async () => {
    await updateUser({
      preferredName,
      occupation,
      traits: traits.join(", "),
      about
    })
    setHasUnsavedChanges(false)
    toast({ title: "Preferences saved", status: "success" })
  }

  const handleAddTrait = (trait: string) => {
    if (trait && !traits.includes(trait) && traits.length < 50) {
      setTraits([...traits, trait])
    }
  }

  const handleRemoveTrait = (traitToRemove: string) => {
    setTraits(traits.filter(trait => trait !== traitToRemove))
  }

  const handleTraitInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTraitInput(e.target.value)
  }

  const handleTraitInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      handleAddTrait(traitInput)
      setTraitInput("")
    }
  }

  const defaultTraits = ["friendly", "witty", "concise", "curious", "empathetic", "creative", "patient"]

  return (
    <div className="w-full">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Customize {APP_NAME}</h1>
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between">
              <label className="mb-2 block text-sm font-medium">
                What should {APP_NAME} call you?
              </label>
              <span className="text-muted-foreground text-sm">
                {preferredName.length}/50
              </span>
            </div>
            <Input
              value={preferredName}
              onChange={e => {
                setPreferredName(e.target.value)
                setHasUnsavedChanges(true)
              }}
              placeholder="Enter your name"
              maxLength={50}
            />
          </div>
          <div>
            <div className="flex justify-between">
              <label className="mb-2 block text-sm font-medium">
                What do you do?
              </label>
              <span className="text-muted-foreground text-sm">
                {occupation.length}/100
              </span>
            </div>
            <Input
              value={occupation}
              onChange={e => {
                setOccupation(e.target.value)
                setHasUnsavedChanges(true)
              }}
              placeholder="Engineer, student, etc."
              maxLength={100}
            />
          </div>
          <div>
            <div className="flex justify-between">
              <label className="mb-2 block text-sm font-medium">
                What traits should {APP_NAME} have?{" "}
                <span className="text-muted-foreground">
                  (up to 50, max 100 chars each)
                </span>
              </label>
              <span className="text-muted-foreground text-sm">
                {traits.length}/50
              </span>
            </div>
            <div className="rounded-lg border bg-background p-2">
              <div className="flex flex-wrap gap-2 mb-2">
                {traits.map(trait => (
                  <div
                    key={trait}
                    className="flex items-center gap-1 rounded-full bg-muted px-3 py-1"
                  >
                    <span>{trait}</span>
                    <button
                      onClick={() => {
                        handleRemoveTrait(trait)
                        setHasUnsavedChanges(true)
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <Input
                value={traitInput}
                onChange={handleTraitInputChange}
                onKeyDown={handleTraitInputKeyDown}
                placeholder="Type a trait and press Enter or Tab..."
                maxLength={50}
                className="border-none bg-transparent focus:ring-0"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {defaultTraits
                .filter(trait => !traits.includes(trait))
                .map(trait => (
                  <Button
                    key={trait}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleAddTrait(trait)
                      setHasUnsavedChanges(true)
                    }}
                  >
                    {trait} +
                  </Button>
                ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between">
              <label className="mb-2 block text-sm font-medium">
                Anything else {APP_NAME} should know about you?
              </label>
              <span className="text-muted-foreground text-sm">
                {about.length}/3000
              </span>
            </div>
            <Textarea
              value={about}
              onChange={e => {
                setAbout(e.target.value)
                setHasUnsavedChanges(true)
              }}
              placeholder="Interests, values, or preferences to keep in mind"
              rows={5}
              maxLength={3000}
              className="max-h-48"
            />
          </div>
          <div className="flex justify-end gap-4">
            <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingUrl(null)}>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingUrl) {
                  setHasUnsavedChanges(false)
                  setShowUnsavedChangesDialog(false)
                  router.push(pendingUrl)
                }
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.back()}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

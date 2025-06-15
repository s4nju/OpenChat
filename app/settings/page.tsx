"use client"

import { Button } from "@/components/ui/button"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useUser } from "@/app/providers/user-provider"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"
import { Rocket, Sparkle, Headset } from "@phosphor-icons/react"
import { MessageUsageCard } from "@/app/components/layout/settings/message-usage-card"

export default function AccountSettingsPage() {
  const deleteAccount = useMutation(api.users.deleteAccount)
  const { signOut } = useUser()
  const router = useRouter()
  return (
    <div className="w-full">
      <div className="space-y-12">
        {/* Pro Plan Benefits */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h2 className="text-left text-2xl font-bold">Pro Plan Benefits</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col items-start rounded-lg border border-secondary/40 bg-card/30 px-6 py-4">
              <div className="mb-2 flex items-center">
                <Rocket className="mr-2 h-5 w-5 text-primary" />
                <span className="text-base font-semibold">Access to All Models</span>
              </div>
              <p className="text-sm text-muted-foreground/80">
                Get access to our full suite of models including Claude, o3-mini-high, and more!
              </p>
            </div>
            <div className="flex flex-col items-start rounded-lg border border-secondary/40 bg-card/30 px-6 py-4">
              <div className="mb-2 flex items-center">
                <Sparkle className="mr-2 h-5 w-5 text-primary" />
                <span className="text-base font-semibold">Generous Limits</span>
              </div>
              <p className="text-sm text-muted-foreground/80">
                Receive <span className="font-bold text-foreground">1500 standard credits</span> per month, plus <span className="font-bold text-foreground">100 premium credits*</span> per month.
              </p>
            </div>
            <div className="flex flex-col items-start rounded-lg border border-secondary/40 bg-card/30 px-6 py-4">
              <div className="mb-2 flex items-center">
                <Headset className="mr-2 h-5 w-5 text-primary" />
                <span className="text-base font-semibold">Priority Support</span>
              </div>
              <p className="text-sm text-muted-foreground/80">
                Get faster responses and dedicated assistance from the team whenever you need help!
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4 md:flex-row pt-4 pb-4">
            <Button className="w-full md:w-64">
              Manage Subscription
            </Button>
          </div>
          <p className="text-sm text-muted-foreground/60">
            <span className="mx-0.5 text-base font-medium">*</span>Premium credits are used for GPT Image Gen, Claude Sonnet, and Grok 3. Additional Premium credits can be purchased separately.
          </p>
          <div className="mt-6 md:hidden">
            <MessageUsageCard />
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-semibold text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data.</p>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                  if (!confirm("This will permanently delete your account and all associated data. This action cannot be undone. Continue?")) return
                  try {
                    await deleteAccount({})
                    await signOut()
                    toast({ title: "Account deleted", status: "success" })
                    router.push("/")
                  } catch (e: any) {
                    console.error(e)
                    toast({ title: "Failed to delete account", status: "error" })
                  }
                }}
              >
                Delete Account
              </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

"use client"

import { useUser } from "@/app/providers/user-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function CustomizationPage() {
  const { user, updateUser } = useUser()
  const router = useRouter()

  const [preferredName, setPreferredName] = useState("")
  const [occupation, setOccupation] = useState("")
  const [traits, setTraits] = useState("")
  const [about, setAbout] = useState("")

  useEffect(() => {
    if (user) {
      setPreferredName(user.preferredName || "")
      setOccupation(user.occupation || "")
      setTraits(user.traits || "")
      setAbout(user.about || "")
    }
  }, [user])

  const handleSave = async () => {
    await updateUser({ preferredName, occupation, traits, about })
    router.back()
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Assistant Customization</h1>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Preferred Name</label>
          <Input value={preferredName} onChange={e => setPreferredName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Occupation</label>
          <Input value={occupation} onChange={e => setOccupation(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Traits</label>
          <Input value={traits} onChange={e => setTraits(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">About</label>
          <Textarea value={about} onChange={e => setAbout(e.target.value)} />
        </div>
        <Button onClick={handleSave} className="mt-2">Save Preferences</Button>
      </div>
    </div>
  )
}

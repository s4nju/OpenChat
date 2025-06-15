"use client"

import { api } from "@/convex/_generated/api"
import { useConvex, useMutation, useQuery } from "convex/react"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import {
  Trash,
  DownloadSimple,
  UploadSimple,
  ClockCounterClockwise
} from "@phosphor-icons/react"
import superjson from "superjson"
import { useUser } from "@/app/providers/user-provider"
import { buildSystemPrompt, MESSAGE_MAX_LENGTH } from "@/lib/config"
import { z } from "zod"

// Schema to validate imported history files
const ImportSchema = z.object({
  exportedAt: z.number().optional(),
  data: z.array(
    z.object({
      chat: z
        .object({
          title: z.string().max(100).optional(),
          model: z.string().max(50).optional(),
        })
        .optional(),
      messages: z
        .array(
          z.object({
            role: z.enum(["user", "assistant", "system"]).optional(),
            content: z.string().min(1).max(MESSAGE_MAX_LENGTH),
            parentMessageId: z.string().optional(),
            _id: z.string().optional(),
            id: z.string().optional(),
            model: z.string().max(50).optional(),
            reasoningText: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
}).strict()

function formatDateLines(timestamp?: number | null) {
  if (!timestamp) return { dateTime: "Unknown", ampm: "" }
  try {
    const d = new Date(timestamp)
    const dateStr = d.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    })
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    const [time, ampm] = timeStr.split(" ")
    return { dateTime: `${dateStr} ${time}`, ampm }
  } catch {
    return { dateTime: "Invalid", ampm: "" }
  }
}

export default function HistoryPage() {
  const chats = useQuery(api.chats.listChatsForUser) ?? (undefined as
    | Doc<"chats">[]
    | undefined)
  const deleteChat = useMutation(api.chats.deleteChat)
  const deleteAllChats = useMutation(api.chats.deleteAllChatsForUser)
  const convex = useConvex()
  const { user } = useUser()

  const [selectedIds, setSelectedIds] = useState<Set<Id<"chats">>>(new Set())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isSelected = (id: Id<"chats">) => selectedIds.has(id)
  const toggleSelect = (id: Id<"chats">) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAll = () => {
    if (!chats) return
    setSelectedIds(new Set(chats.map(c => c._id as Id<"chats">)))
  }
  const clearSelection = () => setSelectedIds(new Set())

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected chat(s)?`)) return
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteChat({ chatId: id })))
      toast({ title: "Selected chats deleted", status: "success" })
      setSelectedIds(new Set())
    } catch (e: any) {
      console.error(e)
      toast({ title: "Failed to delete some chats", status: "error" })
    }
  }

  const handleExport = async () => {
    if (selectedIds.size === 0) return
    toast({ title: "Preparing export…", status: "info" })
    try {
      const data: Array<{ chat: any; messages: any[] }> = []
      for (const id of selectedIds) {
        const chat = chats?.find(c => c._id === id)
        if (!chat) continue
        const messages = await convex.query(api.messages.getMessagesForChat, {
          chatId: id,
        })
        data.push({
          chat: {
            id: chat._id,
            title: chat.title ?? "",
            model: chat.model ?? "",
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
          },
          messages,
        })
      }
      const blob = new Blob([superjson.stringify({ exportedAt: Date.now(), data })], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `openchat-history-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Export complete", status: "success" })
    } catch (e: any) {
      console.error(e)
      toast({ title: "Failed to export chats", status: "error" })
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const MAX_IMPORT_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
// removed chat count limit

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMPORT_SIZE_BYTES) {
      toast({ title: "Import file too large (max 2 MB)", status: "error" })
      e.target.value = ""
      return
    }
    try {
      const text = await file.text()
      const raw = superjson.parse(text)
      const parsed = ImportSchema.safeParse(raw)
      if (!parsed.success) throw new Error("Invalid file format")
      const dataArr = parsed.data.data
      const chatCount = dataArr.length
      
      if (chatCount === 0) throw new Error("No chats found in file")
      if (!confirm(`Import ${chatCount} chat(s) into your account?`)) return
      toast({ title: `Importing ${chatCount} chat(s)…`, status: "info" })

      for (const item of dataArr) {
        const chatMeta = item.chat ?? {}
        const messagesArr: any[] = Array.isArray(item.messages) ? item.messages : []
        const { chatId } = await convex.mutation(api.chats.createChat, {
          title: typeof chatMeta.title === "string" && chatMeta.title.length <= 100 ? chatMeta.title : "Imported Chat",
          model: typeof chatMeta.model === "string" && chatMeta.model.length <= 50 ? chatMeta.model : undefined,
          systemPrompt: buildSystemPrompt(user),
        })
        // Map original message IDs to new IDs to preserve threading
        const idMap = new Map<string, string>()
        for (const msg of messagesArr) {
          if (!msg || typeof msg.content !== "string" || msg.content.length === 0) continue
          const role: string = msg.role || "assistant"
          const parentOriginal: string | undefined = msg.parentMessageId
          const parentNew = parentOriginal ? idMap.get(parentOriginal) : undefined
          try {
            let result
            if (role === "user") {
              result = await convex.mutation(api.messages.sendUserMessageToChat, {
                chatId,
                role: "user",
                content: msg.content,
                parentMessageId: parentNew as any,
                reasoningText: msg.reasoningText ?? undefined,
                experimentalAttachments: undefined,
                model: msg.model ?? undefined,
              })
            } else {
              result = await convex.mutation(api.messages.saveAssistantMessage, {
                chatId,
                role: role === "assistant" ? "assistant" : "system",
                content: msg.content,
                parentMessageId: parentNew as any,
                reasoningText: msg.reasoningText ?? undefined,
                experimentalAttachments: undefined,
                model: msg.model ?? undefined,
              })
            }
            idMap.set(msg._id ?? msg.id ?? '', result.messageId)
          } catch (innerErr) {
            console.error("Error importing message", innerErr)
          }
        }
      }
      toast({ title: "Import completed", status: "success" })
      setSelectedIds(new Set())
    } catch (err: any) {
      console.error(err)
      toast({ title: err.message || "Failed to import file", status: "error" })
    } finally {
      e.target.value = ""
    }
  }

  return (
    <div className="w-full">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Message History <ClockCounterClockwise className="size-5 text-muted-foreground" />
        </h1>
        <p className="text-muted-foreground text-sm">
          Save your history as JSON, or import someone else's. Importing will NOT delete
          existing messages.
        </p>
        {!chats ? (
          <p className="text-muted-foreground">Loading chats…</p>
        ) : chats.length === 0 ? (
          <p className="text-muted-foreground">No chats found.</p>
        ) : (
          <div className="space-y-4">
            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2 px-4"
                  onClick={() => {
                    if (chats && selectedIds.size === chats.length) {
                      clearSelection()
                    } else {
                      selectAll()
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={chats && chats.length > 0 && selectedIds.size === chats.length}
                    readOnly
                  />
                  <span className="hidden sm:inline text-sm">Select All</span>
                </Button>
                {selectedIds.size > 0 && (
                  <Button type="button" variant="secondary" size="sm" onClick={clearSelection}>
                    Clear <span className="hidden sm:inline text-sm">Selection</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={selectedIds.size === 0}
                  onClick={handleExport}
                >
                  <DownloadSimple className="size-4" /> <span className="hidden sm:inline">Export</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={selectedIds.size === 0}
                  onClick={handleDeleteSelected}
                >
                  <Trash className="size-4" /> <span className="hidden sm:inline">Delete</span>
                </Button>
                <Button variant="secondary" size="sm" className="flex items-center gap-2" onClick={handleImportClick}>
                  <UploadSimple className="size-4" /> <span className="hidden sm:inline">Import</span>
                </Button>
                <input
                  type="file"
                  accept="application/json"
                  ref={fileInputRef}
                  onChange={handleImport}
                  className="hidden"
                />
              </div>
            </div>
            {/* Chats List */}
            <div className="rounded-lg border divide-y max-h-[21.4vh] overflow-y-auto">
              {chats.map(chat => (
                <div
                  key={chat._id}
                  className={`flex items-center gap-2 py-1 px-2 text-sm ${isSelected(chat._id as Id<"chats">) ? "bg-muted/50" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={isSelected(chat._id as Id<"chats">)}
                    onChange={() => toggleSelect(chat._id as Id<"chats">)}
                  />
                  <span className="truncate font-medium flex-1">{chat.title || "Untitled Chat"}</span>
                  {(() => {
                    const { dateTime, ampm } = formatDateLines(chat.updatedAt ?? chat.createdAt)
                    return (
                      <div className="ml-auto flex flex-col items-end w-24 shrink-0 px-1">
                        <span className="text-xs">{dateTime}</span>
                        <span className="text-[10px] text-muted-foreground">{ampm}</span>
                      </div>
                    )
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Danger Zone */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">Permanently delete all of your chat history. This action cannot be undone.</p>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!confirm("This will permanently delete all chat history. Are you sure?")) return
              try {
                await deleteAllChats({})
                toast({ title: "All chats deleted", status: "success" })
              } catch (error) {
                console.error(error)
                toast({ title: "Failed to delete chats", status: "error" })
              }
            }}
          >
            <Trash className="size-4 mr-2" /> Delete All Chats
          </Button>
        </div>
      </div>
    </div>
  )
}

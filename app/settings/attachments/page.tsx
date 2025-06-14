"use client"

import { SettingsNav } from "@/app/components/layout/settings/settings-nav"

import { api } from "@/convex/_generated/api"
import { useState } from "react"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { useQuery, useMutation } from "convex/react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { Trash, FileText, ArrowSquareOut } from "@phosphor-icons/react"


function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export default function AttachmentsPage() {
  const attachments =
    useQuery(api.files.getAttachmentsForUser) ?? (undefined as
      | (Doc<"chat_attachments"> & { url: string | null })[]
      | undefined)
  const deleteAttachment = useMutation(api.files.deleteAttachment)
  const [selectedIds, setSelectedIds] = useState<Set<Id<"chat_attachments">>>(new Set())

  const isSelected = (id: Id<"chat_attachments">) => selectedIds.has(id)
  const toggleSelect = (id: Id<"chat_attachments">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAll = () => {
    if (!attachments) return
    setSelectedIds(new Set(attachments.map((a) => a._id as Id<"chat_attachments">)))
  }
  const clearSelection = () => setSelectedIds(new Set())

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected attachment(s)?`)) return
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteAttachment({ attachmentId: id }))
      )
      toast({ title: "Selected attachments deleted", status: "success" })
      setSelectedIds(new Set())
    } catch (e: any) {
      console.error(e)
      toast({ title: "Failed to delete some attachments", status: "error" })
    }
  }

  const handleDelete = async (attachmentId: Id<"chat_attachments">) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return
    try {
      await deleteAttachment({ attachmentId })
      toast({ title: "Attachment deleted", status: "success" })
    } catch (e: any) {
      console.error(e)
      toast({ title: "Failed to delete attachment", status: "error" })
    }
  }

  return (
    <div className="w-full">
      <SettingsNav />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Attachments</h1>
        <p className="text-muted-foreground text-sm max-w-prose">
          Manage your uploaded files and attachments. Note that deleting files
          here will remove them from the relevant chats, but will not delete
          those chats. This may lead to unexpected behavior if you delete a
          file that is still referenced in a chat.
        </p>
        {!attachments ? (
          <p className="text-muted-foreground">Loading attachments...</p>
        ) : attachments.length === 0 ? (
          <p className="text-muted-foreground">No attachments found.</p>
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
                      if (attachments && selectedIds.size === attachments.length) {
                        clearSelection()
                      } else {
                        selectAll()
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={attachments && attachments.length > 0 && selectedIds.size === attachments.length}
                      readOnly
                    />
                    <span className="hidden sm:inline text-sm">Select All</span>
                  </Button>
                  {selectedIds.size > 0 && (
                    <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={clearSelection}
                  >
                      Clear <span className="hidden sm:inline text-sm">Selection</span>
                    </Button>
                  )}
                </div>
                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={deleteSelected}
                    >
                      <Trash className="size-4" /> <span className="hidden sm:inline">Delete</span>
                      
                  </Button>
                )}
              </div>
            {attachments.map((att) => (
              <div
                key={att._id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${isSelected(att._id as Id<"chat_attachments">) ? "bg-muted/50 border-primary" : ""}`}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={isSelected(att._id as Id<"chat_attachments">)}
                  onChange={() => toggleSelect(att._id as Id<"chat_attachments">)}
                />
                {
                  att.fileType.startsWith("image/") && att.url ? (
                    <div className="h-10 w-10 overflow-hidden rounded border">
                      <img
                        src={att.url}
                        alt={att.fileName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted/5">
                      <FileText className="size-5 text-muted-foreground" />
                    </div>
                  )
                }
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <a
                    href={att.url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 truncate text-primary hover:underline"
                  >
                    <span className="truncate">{att.fileName}</span>
                    <ArrowSquareOut className="size-4 shrink-0" />
                  </a>
                  <span className="text-muted-foreground text-sm">
                    {att.fileType} • {formatBytes(att.fileSize)}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(att._id as Id<"chat_attachments">)}
                >
                  <Trash className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

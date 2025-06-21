"use client"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { ArrowSquareOut, FileText, Trash } from "@phosphor-icons/react"
import { useMutation, useQuery } from "convex/react"
import Image from "next/image"
import { useState } from "react"

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export default function AttachmentsPage() {
  const attachments =
    useQuery(api.files.getAttachmentsForUser) ??
    (undefined as
      | (Doc<"chat_attachments"> & { url: string | null })[]
      | undefined)
  const deleteAttachments = useMutation(api.files.deleteAttachments)
  const [selectedIds, setSelectedIds] = useState<Set<Id<"chat_attachments">>>(
    new Set()
  )

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
    setSelectedIds(
      new Set(attachments.map((a) => a._id as Id<"chat_attachments">))
    )
  }
  const clearSelection = () => setSelectedIds(new Set())

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected attachment(s)?`)) return
    try {
      await deleteAttachments({ attachmentIds: Array.from(selectedIds) })
      toast({ title: "Selected attachments deleted", status: "success" })
      setSelectedIds(new Set())
    } catch (e: unknown) {
      console.error(e)
      toast({ title: "Failed to delete some attachments", status: "error" })
    }
  }

  const handleDelete = async (attachmentId: Id<"chat_attachments">) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return
    try {
      await deleteAttachments({ attachmentIds: [attachmentId] })
      toast({ title: "Attachment deleted", status: "success" })
    } catch (e: unknown) {
      console.error(e)
      toast({ title: "Failed to delete attachment", status: "error" })
    }
  }

  return (
    <div className="w-full">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Attachments</h1>
        <p className="text-muted-foreground max-w-prose text-sm">
          Manage your uploaded files and attachments. Note that deleting files
          here will remove them from the relevant chats, but will not delete
          those chats. This may lead to unexpected behavior if you delete a file
          that is still referenced in a chat.
        </p>
        <div className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex items-center gap-2 px-4"
                disabled={!attachments}
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
                  className="accent-primary size-4"
                  checked={
                    !!(
                      attachments &&
                      attachments.length > 0 &&
                      selectedIds.size === attachments.length
                    )
                  }
                  readOnly
                />
                <span className="hidden text-sm sm:inline">Select All</span>
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear{" "}
                  <span className="hidden text-sm sm:inline">Selection</span>
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
                <Trash className="size-4" />{" "}
                <span className="hidden sm:inline">Delete</span>
                {selectedIds.size > 0 && ` (${selectedIds.size})`}
              </Button>
            )}
          </div>
          {/* Attachments List */}
          {!attachments ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="bg-muted h-4 w-4 animate-pulse rounded"></div>
                  <div className="bg-muted h-10 w-10 animate-pulse rounded"></div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="bg-muted h-4 w-2/3 animate-pulse rounded"></div>
                    <div className="bg-muted h-3 w-1/3 animate-pulse rounded"></div>
                  </div>
                  <div className="bg-muted h-8 w-8 animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-muted-foreground">No attachments found.</p>
          ) : (
            attachments.map((att) => (
              <div
                key={att._id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${isSelected(att._id as Id<"chat_attachments">) ? "bg-muted/50 border-primary" : ""}`}
              >
                <input
                  type="checkbox"
                  className="accent-primary size-4"
                  checked={isSelected(att._id as Id<"chat_attachments">)}
                  onChange={() =>
                    toggleSelect(att._id as Id<"chat_attachments">)
                  }
                />
                {att.fileType.startsWith("image/") && att.url ? (
                  <div className="h-10 w-10 overflow-hidden rounded border">
                    <Image
                      src={att.url}
                      alt={att.fileName}
                      className="h-full w-full object-cover"
                      width={40}
                      height={40}
                    />
                  </div>
                ) : (
                  <div className="bg-muted/5 flex h-10 w-10 items-center justify-center rounded border">
                    <FileText className="text-muted-foreground size-5" />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <a
                    href={att.url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-1 truncate hover:underline"
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
                  onClick={() =>
                    handleDelete(att._id as Id<"chat_attachments">)
                  }
                >
                  <Trash className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

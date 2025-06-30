'use client';

import { ArrowSquareOut, FileText, Trash } from '@phosphor-icons/react';
import { useMutation, useQuery } from 'convex/react';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}

export default function AttachmentsPage() {
  const rawAttachments =
    useQuery(api.files.getAttachmentsForUser) ??
    (undefined as
      | (Doc<'chat_attachments'> & { url: string | null })[]
      | undefined);

  // Sort attachments by creation time (latest first)
  const attachments = rawAttachments?.sort(
    (a, b) =>
      new Date(b._creationTime).getTime() - new Date(a._creationTime).getTime()
  );
  const deleteAttachments = useMutation(api.files.deleteAttachments);
  const [selectedIds, setSelectedIds] = useState<Set<Id<'chat_attachments'>>>(
    new Set()
  );

  const isSelected = (id: Id<'chat_attachments'>) => selectedIds.has(id);
  const toggleSelect = (id: Id<'chat_attachments'>) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const selectAll = () => {
    if (!attachments) {
      return;
    }
    setSelectedIds(
      new Set(attachments.map((a) => a._id as Id<'chat_attachments'>))
    );
  };
  const clearSelection = () => setSelectedIds(new Set());

  const deleteSelected = async () => {
    if (selectedIds.size === 0) {
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected attachment(s)?`)) {
      return;
    }
    try {
      await deleteAttachments({ attachmentIds: Array.from(selectedIds) });
      toast({ title: 'Selected attachments deleted', status: 'success' });
      setSelectedIds(new Set());
    } catch {
      toast({ title: 'Failed to delete some attachments', status: 'error' });
    }
  };

  const handleDelete = async (attachmentId: Id<'chat_attachments'>) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }
    try {
      await deleteAttachments({ attachmentIds: [attachmentId] });
      toast({ title: 'Attachment deleted', status: 'success' });
    } catch {
      toast({ title: 'Failed to delete attachment', status: 'error' });
    }
  };

  return (
    <div className="w-full">
      <div className="space-y-6">
        <h1 className="font-bold text-2xl">Attachments</h1>
        <p className="max-w-prose text-muted-foreground text-sm">
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
                className="flex items-center gap-2 px-4"
                disabled={!attachments}
                onClick={() => {
                  if (attachments && selectedIds.size === attachments.length) {
                    clearSelection();
                  } else {
                    selectAll();
                  }
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                <input
                  checked={
                    !!(
                      attachments &&
                      attachments.length > 0 &&
                      selectedIds.size === attachments.length
                    )
                  }
                  className="size-4 accent-primary"
                  readOnly
                  type="checkbox"
                />
                <span className="hidden text-sm sm:inline">Select All</span>
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  onClick={clearSelection}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Clear{' '}
                  <span className="hidden text-sm sm:inline">Selection</span>
                </Button>
              )}
            </div>
            {selectedIds.size > 0 && (
              <Button
                className="flex items-center gap-2"
                onClick={deleteSelected}
                size="sm"
                variant="destructive"
              >
                <Trash className="size-4" />{' '}
                <span className="hidden sm:inline">Delete</span>
                {selectedIds.size > 0 && ` (${selectedIds.size})`}
              </Button>
            )}
          </div>
          {/* Attachments List */}
          {attachments ? (
            attachments.length === 0 ? (
              <p className="text-muted-foreground">No attachments found.</p>
            ) : (
              attachments.map((att) => (
                <div
                  className={`flex items-center gap-4 rounded-lg border p-4 ${isSelected(att._id as Id<'chat_attachments'>) ? 'border-primary bg-muted/50' : ''}`}
                  key={att._id}
                >
                  <input
                    checked={isSelected(att._id as Id<'chat_attachments'>)}
                    className="size-4 accent-primary"
                    onChange={() =>
                      toggleSelect(att._id as Id<'chat_attachments'>)
                    }
                    type="checkbox"
                  />
                  {att.fileType.startsWith('image/') && att.url ? (
                    <div className="h-10 w-10 overflow-hidden rounded border">
                      <Image
                        alt={att.fileName}
                        className="h-full w-full object-cover"
                        height={40}
                        src={att.url}
                        width={40}
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted/5">
                      <FileText className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <a
                      className="flex items-center gap-1 truncate text-primary hover:underline"
                      href={att.url ?? undefined}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span className="truncate">{att.fileName}</span>
                      <ArrowSquareOut className="size-4 shrink-0" />
                    </a>
                    <span className="text-muted-foreground text-sm">
                      {att.fileType} • {formatBytes(att.fileSize)}
                    </span>
                  </div>
                  <Button
                    onClick={() =>
                      handleDelete(att._id as Id<'chat_attachments'>)
                    }
                    size="icon"
                    variant="destructive"
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              ))
            )
          ) : (
            <div className="space-y-4">
              {['skeleton-1', 'skeleton-2', 'skeleton-3'].map((skeletonId) => (
                <div
                  className="flex items-center gap-4 rounded-lg border p-4"
                  key={skeletonId}
                >
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-10 w-10 animate-pulse rounded bg-muted" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

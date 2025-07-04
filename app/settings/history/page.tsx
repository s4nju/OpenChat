'use client';

import {
  ClockCounterClockwise,
  DownloadSimple,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { useRef, useState } from 'react';
import superjson from 'superjson';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { MESSAGE_MAX_LENGTH } from '@/lib/config';

// Schema to validate imported history files (supports both old and new formats)
const ImportSchema = z
  .object({
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
              role: z.enum(['user', 'assistant', 'system']).optional(),
              content: z.string().min(1).max(MESSAGE_MAX_LENGTH),
              parentMessageId: z.string().optional(),
              _id: z.string().optional(),
              id: z.string().optional(),
              // Legacy fields (for backward compatibility)
              model: z.string().max(50).optional(),
              reasoningText: z.string().optional(),
              // New schema fields
              parts: z.array(z.any()).optional(),
              createdAt: z.number().optional(),
              metadata: z
                .object({
                  modelName: z.string().optional(),
                  modelId: z.string().optional(),
                  promptTokens: z.union([z.number(), z.nan()]).optional(),
                  completionTokens: z.union([z.number(), z.nan()]).optional(),
                  reasoningTokens: z.union([z.number(), z.nan()]).optional(),
                  serverDurationMs: z.number().optional(),
                })
                .optional(),
            })
          )
          .optional(),
      })
    ),
  })
  .strict();

function formatDateLines(timestamp?: number | null) {
  if (!timestamp) {
    return { dateTime: 'Unknown', ampm: '' };
  }
  try {
    const d = new Date(timestamp);
    const dateStr = d.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    });
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const [time, ampm] = timeStr.split(' ');
    return { dateTime: `${dateStr} ${time}`, ampm };
  } catch {
    return { dateTime: 'Invalid', ampm: '' };
  }
}

export default function HistoryPage() {
  const chats =
    useQuery(api.chats.listChatsForUser) ??
    (undefined as Doc<'chats'>[] | undefined);
  const deleteChat = useMutation(api.chats.deleteChat);
  const deleteBulkChats = useMutation(api.chats.deleteBulkChats);
  const deleteAllChats = useMutation(api.chats.deleteAllChatsForUser);
  const convex = useConvex();

  const [selectedIds, setSelectedIds] = useState<Set<Id<'chats'>>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isSelected = (id: Id<'chats'>) => selectedIds.has(id);
  const toggleSelect = (id: Id<'chats'>) => {
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
    if (!chats) {
      return;
    }
    setSelectedIds(new Set(chats.map((c) => c._id as Id<'chats'>)));
  };
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected chat(s)?`)) {
      return;
    }
    try {
      // Use bulk delete for better performance when deleting multiple chats
      if (selectedIds.size === 1) {
        // Single chat - use the existing single delete mutation
        const chatId = Array.from(selectedIds)[0];
        await deleteChat({ chatId });
      } else {
        // Multiple chats - use the new bulk delete mutation
        await deleteBulkChats({ chatIds: Array.from(selectedIds) });
      }
      toast({ title: 'Selected chats deleted', status: 'success' });
      setSelectedIds(new Set());
    } catch {
      toast({ title: 'Failed to delete some chats', status: 'error' });
    }
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      return;
    }
    toast({ title: 'Preparing export…', status: 'info' });
    try {
      // Use proper Convex types
      const data: Array<{
        chat: Pick<
          Doc<'chats'>,
          '_id' | 'title' | 'model' | 'createdAt' | 'updatedAt' | 'personaId'
        >;
        messages: Doc<'messages'>[];
      }> = [];

      await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const chat = chats?.find((c) => c._id === id);
          if (!chat) {
            return;
          }
          const messages = await convex.query(api.messages.getMessagesForChat, {
            chatId: id,
          });
          data.push({
            chat: {
              _id: chat._id,
              title: chat.title ?? '',
              model: chat.model ?? '',
              personaId: chat.personaId,
              createdAt: chat.createdAt,
              updatedAt: chat.updatedAt,
            },
            messages,
          });
        })
      );
      const blob = new Blob(
        [superjson.stringify({ exportedAt: Date.now(), data })],
        {
          type: 'application/json',
        }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openchat-history-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export complete', status: 'success' });
    } catch {
      toast({ title: 'Failed to export chats', status: 'error' });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const MAX_IMPORT_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
  // removed chat count limit

  async function processImportFile(file: File) {
    if (file.size > MAX_IMPORT_SIZE_BYTES) {
      toast({ title: 'Import file too large (max 2 MB)', status: 'error' });
      return;
    }

    const text = await file.text();
    const data = superjson.parse(text);
    const parsed = ImportSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error('Invalid file format');
    }

    const dataArr = parsed.data.data;
    const chatCount = dataArr.length;

    if (chatCount === 0) {
      throw new Error('No chats found in file');
    }
    if (!confirm(`Import ${chatCount} chat(s) into your account?`)) {
      return;
    }
    toast({ title: `Importing ${chatCount} chat(s)…`, status: 'info' });

    // Use the new bulk import mutation
    await Promise.all(
      dataArr.map(async (item) => {
        const chatMeta = item.chat ?? {};
        const messages = (item.messages ?? [])
          .filter(
            (msg) =>
              msg &&
              typeof msg.content === 'string' &&
              msg.content.length > 0 &&
              msg.content.length <= MESSAGE_MAX_LENGTH
          )
          .map((msg) => ({
            role: (msg.role || 'assistant') as 'user' | 'assistant' | 'system',
            content: msg.content,
            parts: msg.parts,
            metadata:
              msg.metadata ??
              (msg.model ? { modelName: msg.model } : undefined),
            originalId: msg._id || msg.id,
            parentOriginalId: msg.parentMessageId,
            createdAt:
              typeof msg.createdAt === 'number' ? msg.createdAt : undefined,
          }));

        if (messages.length === 0) {
          return;
        }

        await convex.mutation(api.import_export.bulkImportChat, {
          chat: {
            title:
              typeof chatMeta.title === 'string' && chatMeta.title.length <= 100
                ? chatMeta.title
                : undefined,
            model:
              typeof chatMeta.model === 'string' && chatMeta.model.length <= 50
                ? chatMeta.model
                : undefined,
          },
          messages,
        });
      })
    );

    toast({ title: 'Import completed', status: 'success' });
    setSelectedIds(new Set());
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    await processImportFile(file);
  };

  return (
    <div className="w-full">
      <div className="space-y-6">
        <h1 className="flex items-center gap-2 font-bold text-2xl">
          Message History{' '}
          <ClockCounterClockwise className="size-5 text-muted-foreground" />
        </h1>
        <p className="text-muted-foreground text-sm">
          Save your history as JSON, or import someone else&apos;s. Importing
          will NOT delete existing messages.
        </p>
        <div className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                className="flex items-center gap-2 px-4"
                disabled={!chats}
                onClick={() => {
                  if (
                    chats &&
                    chats.length > 0 &&
                    selectedIds.size === chats.length
                  ) {
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
                      chats &&
                      chats.length > 0 &&
                      selectedIds.size === chats.length
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
            <div className="flex items-center gap-2">
              <Button
                className="flex items-center gap-2"
                disabled={!chats || selectedIds.size === 0}
                onClick={handleExport}
                size="sm"
                variant="secondary"
              >
                <DownloadSimple className="size-4" />{' '}
                <span className="hidden sm:inline">Export</span>
                {selectedIds.size > 0 && ` (${selectedIds.size})`}
              </Button>
              <Button
                className="flex items-center gap-2"
                disabled={!chats || selectedIds.size === 0}
                onClick={handleDeleteSelected}
                size="sm"
                variant="destructive"
              >
                <Trash className="size-4" />{' '}
                <span className="hidden sm:inline">Delete</span>
                {selectedIds.size > 0 && ` (${selectedIds.size})`}
              </Button>
              <Button
                className="flex items-center gap-2"
                onClick={handleImportClick}
                size="sm"
                variant="secondary"
              >
                <UploadSimple className="size-4" />{' '}
                <span className="hidden sm:inline">Import</span>
              </Button>
              <input
                accept="application/json"
                className="hidden"
                onChange={handleImport}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </div>
          {/* Chats List */}
          {chats ? (
            chats.length === 0 ? (
              <p className="text-muted-foreground">No chats found.</p>
            ) : (
              <div className="max-h-[21.4vh] divide-y overflow-y-auto rounded-lg border">
                {chats.map((chat) => (
                  <div
                    className={`flex items-center gap-4 px-4 py-1 text-sm ${isSelected(chat._id as Id<'chats'>) ? 'bg-muted/50' : ''}`}
                    key={chat._id}
                  >
                    <input
                      checked={isSelected(chat._id as Id<'chats'>)}
                      className="size-4 accent-primary"
                      onChange={() => toggleSelect(chat._id as Id<'chats'>)}
                      type="checkbox"
                    />
                    <span className="flex-1 truncate font-medium">
                      {chat.title || 'Untitled Chat'}
                    </span>
                    {(() => {
                      const { dateTime, ampm } = formatDateLines(
                        chat.updatedAt ?? chat.createdAt
                      );
                      return (
                        <div className="ml-auto flex w-24 shrink-0 flex-col items-end px-1">
                          <span className="text-xs">{dateTime}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {ampm}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="max-h-21.4vh] divide-y overflow-y-auto rounded-lg border">
              {Array.from({ length: 6 }).map((_, i) => {
                const key = `skeleton-${i}`;
                return (
                  <div
                    className="flex items-center gap-2 px-4 py-1 text-sm"
                    key={key}
                  >
                    <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                    <div className="ml-auto flex w-24 shrink-0 flex-col items-end gap-1 px-1">
                      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-8 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Danger Zone */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold text-destructive">Danger Zone</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Permanently delete all of your chat history. This action cannot be
            undone.
          </p>
          <Button
            onClick={async () => {
              if (
                !confirm(
                  'This will permanently delete all chat history. Are you sure?'
                )
              ) {
                return;
              }
              try {
                await deleteAllChats({});
                toast({ title: 'All chats deleted', status: 'success' });
              } catch {
                toast({ title: 'Failed to delete chats', status: 'error' });
              }
            }}
            size="sm"
            variant="destructive"
          >
            <Trash className="mr-2 size-4" /> Delete All Chats
          </Button>
        </div>

        {/* Retention policy note */}
        <p className="mt-6 text-muted-foreground text-xs italic">
          *The retention policies of our LLM hosting partners may vary.
        </p>
      </div>
    </div>
  );
}

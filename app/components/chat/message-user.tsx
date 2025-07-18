'use client';

import { Check, Copy, FilePdf, Trash } from '@phosphor-icons/react';
import type { FileUIPart, UIMessage as MessageType } from 'ai';
import Image from 'next/image';
import type React from 'react';
import { memo, useEffect, useRef, useState } from 'react';
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTrigger,
} from '@/components/motion-primitives/morphing-dialog';
import {
  MessageAction,
  MessageActions,
  Message as MessageContainer,
  MessageContent,
} from '@/components/prompt-kit/message';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const getTextFromDataUrl = (dataUrl: string) => {
  const base64 = dataUrl.split(',')[1];
  return base64;
};

// Helper function to render different file parts
const renderFilePart = (filePart: FileUIPart) => {
  if (filePart.mediaType?.startsWith('image')) {
    return (
      <MorphingDialog
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 18,
          mass: 0.3,
        }}
      >
        <MorphingDialogTrigger className="z-10">
          <Image
            alt={filePart.filename ?? ''}
            className="mb-1 rounded-md"
            height={160}
            key={filePart.filename}
            src={filePart.url}
            width={160}
          />
        </MorphingDialogTrigger>
        <MorphingDialogContainer>
          <MorphingDialogContent className="relative rounded-lg">
            <MorphingDialogImage
              alt={filePart.filename || ''}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              src={filePart.url}
            />
          </MorphingDialogContent>
          <MorphingDialogClose className="text-primary" />
        </MorphingDialogContainer>
      </MorphingDialog>
    );
  }

  if (filePart.mediaType?.startsWith('text')) {
    return (
      <div className="mb-3 h-24 w-40 overflow-hidden rounded-md border p-2 text-primary text-xs">
        {getTextFromDataUrl(filePart.url)}
      </div>
    );
  }

  if (filePart.mediaType === 'application/pdf') {
    return (
      <a
        aria-label={`Download PDF: ${filePart.filename}`}
        className="mb-2 flex w-35 cursor-pointer flex-col justify-between rounded-lg border border-gray-200 bg-muted px-4 py-2 shadow-sm transition-colors hover:bg-muted/80 focus:bg-muted/70 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:focus:bg-zinc-800 dark:hover:bg-zinc-700"
        download={filePart.filename}
        href={filePart.url}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            (e.currentTarget as HTMLAnchorElement).click();
          }
        }}
        rel="noopener noreferrer"
        style={{ minWidth: 0, minHeight: 64 }}
        tabIndex={0}
        target="_blank"
      >
        {/* Placeholder preview lines */}
        <div
          aria-hidden="true"
          className="mt-1 mb-2 flex flex-1 flex-col gap-0.5"
        >
          <div className="h-2 w-4/5 rounded bg-gray-200 dark:bg-zinc-600" />
          <div className="h-2 w-3/5 rounded bg-gray-200 dark:bg-zinc-600" />
          <div className="h-2 w-2/5 rounded bg-gray-200 dark:bg-zinc-600" />
        </div>
        {/* Footer with icon and filename */}
        <div className="flex items-center gap-2">
          <FilePdf
            aria-hidden="true"
            className="shrink-0 text-gray-500 dark:text-gray-300"
            size={20}
            weight="duotone"
          />
          <span
            className="overflow-hidden truncate whitespace-nowrap font-medium text-gray-900 text-sm dark:text-gray-100"
            style={{ maxWidth: 'calc(100% - 28px)' }}
            title={filePart.filename}
          >
            {filePart.filename}
          </span>
        </div>
      </a>
    );
  }

  return null;
};

export type MessageUserProps = {
  hasScrollAnchor?: boolean;
  parts?: MessageType['parts'];
  copied: boolean;
  copyToClipboard: () => void;
  onEdit: (id: string, newText: string) => void;
  onReload: () => void;
  onDelete: (id: string) => void;
  id: string;
  status?: 'streaming' | 'ready' | 'submitted' | 'error';
};

function MessageUserInner({
  hasScrollAnchor,
  parts,
  copied,
  copyToClipboard,
  onEdit,
  onReload,
  onDelete,
  id,
  status,
}: MessageUserProps): React.ReactElement {
  // Extract text content from parts
  const textContent =
    parts
      ?.filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('') || '';

  const [editInput, setEditInput] = useState(textContent);
  const [isEditing, setIsEditing] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const displayContent = textContent.replace(/\n{2,}/g, '\n\n');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  // Update editInput when textContent changes
  useEffect(() => {
    if (!isEditing) {
      setEditInput(textContent);
    }
  }, [textContent, isEditing]);

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditInput(textContent);
  };

  const handleSave = () => {
    if (onEdit) {
      onEdit(id, editInput);
    }
    onReload();
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(id);
  };

  return (
    <MessageContainer
      className={cn(
        'group flex w-full max-w-3xl flex-col items-end gap-2 px-6 pb-2',
        hasScrollAnchor && 'min-h-scroll-anchor'
      )}
      id={id}
    >
      {parts
        ?.filter((part): part is FileUIPart => part.type === 'file')
        .map((filePart, index) => (
          <div
            className="flex flex-row gap-2"
            key={`${filePart.filename}-${index}`}
          >
            {renderFilePart(filePart)}
          </div>
        ))}
      {isEditing ? (
        <div
          className="relative flex min-w-[180px] flex-col gap-2 rounded-3xl bg-accent px-5 py-2.5"
          style={{
            width: contentRef.current?.offsetWidth,
          }}
        >
          <textarea
            autoFocus
            className="w-full resize-none bg-transparent outline-none"
            onChange={(e) => setEditInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
              if (e.key === 'Escape') {
                handleEditCancel();
              }
            }}
            value={editInput}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={handleEditCancel} size="sm" variant="ghost">
              Cancel
            </Button>
            <Button onClick={handleSave} size="sm">
              Save
            </Button>
          </div>
        </div>
      ) : (
        <MessageContent
          className="relative max-w-[70%] whitespace-pre-line rounded-3xl bg-accent px-5 py-2.5"
          markdown={false}
          ref={contentRef}
        >
          {displayContent}
        </MessageContent>
      )}
      <MessageActions
        className={cn(
          'flex gap-0 transition-opacity',
          isTouch
            ? 'opacity-100'
            : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
        )}
      >
        <MessageAction
          delayDuration={0}
          side="bottom"
          tooltip={copied ? 'Copied!' : 'Copy text'}
        >
          <button
            aria-label="Copy text"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition disabled:cursor-not-allowed disabled:opacity-50"
            disabled={status === 'streaming'}
            onClick={copyToClipboard}
            type="button"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </MessageAction>
        {/* @todo: add when ready */}
        {/* <MessageAction
          tooltip={isEditing ? "Save" : "Edit"}
          side="bottom"
          delayDuration={0}
        >
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Edit"
            onClick={() => setIsEditing(!isEditing)}
            type="button"
          >
            <PencilSimple className="size-4" />
          </button>
        </MessageAction> */}
        <MessageAction delayDuration={0} side="bottom" tooltip="Delete">
          <button
            aria-label="Delete"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition disabled:cursor-not-allowed disabled:opacity-50"
            disabled={status === 'streaming'}
            onClick={handleDelete}
            type="button"
          >
            <Trash className="size-4" />
          </button>
        </MessageAction>
      </MessageActions>
    </MessageContainer>
  );
}

export const MessageUser = memo(MessageUserInner);

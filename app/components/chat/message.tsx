import type { UIMessage as MessageType } from '@ai-sdk/react';
import type { Infer } from 'convex/values';
import React, { useState } from 'react';
import type { Message as MessageSchema } from '@/convex/schema/message';
import { MessageAssistant } from './message-assistant';
import { MessageUser } from './message-user';

export type MessageProps = {
  variant: MessageType['role'];
  model?: string;
  id: string;
  isLast?: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onReload: () => void;
  onBranch: () => void;
  hasScrollAnchor?: boolean;
  parts?: MessageType['parts'];
  status?: 'streaming' | 'ready' | 'submitted' | 'error'; // Add status prop
  metadata?: Infer<typeof MessageSchema>['metadata'];
};

function MessageComponent({
  variant,
  model,
  id,
  isLast,
  onDelete,
  onEdit,
  onReload,
  onBranch,
  hasScrollAnchor,
  parts,
  status, // Receive status prop
  metadata,
}: MessageProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    // Extract text content from parts for copying
    const textContent =
      parts
        ?.filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('') || '';
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 500);
  };

  if (variant === 'user') {
    return (
      <MessageUser
        copied={copied}
        copyToClipboard={copyToClipboard}
        hasScrollAnchor={hasScrollAnchor}
        id={id}
        onDelete={onDelete}
        onEdit={onEdit}
        parts={parts}
        status={status}
      />
    );
  }

  if (variant === 'assistant') {
    return (
      <MessageAssistant
        copied={copied}
        copyToClipboard={copyToClipboard}
        hasScrollAnchor={hasScrollAnchor}
        id={id}
        isLast={isLast}
        metadata={metadata}
        model={model}
        onBranch={onBranch}
        onReload={onReload}
        parts={parts}
        status={status}
      />
    );
  }

  return null;
}

export const Message = React.memo(MessageComponent);
Message.displayName = 'Message';

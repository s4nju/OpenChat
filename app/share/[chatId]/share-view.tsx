'use client';

import type { UIMessage } from '@ai-sdk/react';
import { ArrowUpRight } from '@phosphor-icons/react';
import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { Message } from '@/app/components/chat/message';
import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { cn } from '@/lib/utils';

type SharedMessage = {
  _id: string;
  role: UIMessage['role'];
  parts?: UIMessage['parts'];
  metadata?: Record<string, unknown>;
};

export default function ShareView({
  messages,
  sourceChatId,
}: {
  messages: SharedMessage[];
  sourceChatId: string;
}) {
  const fork = useMutation(api.chats.forkFromShared);
  const router = useRouter();
  const onFork = async () => {
    try {
      const result = await fork({ sourceChatId: sourceChatId as Id<'chats'> });
      // Navigate to the new chat
      router.push(`/c/${result.chatId}`);
    } catch (_e) {
      // no-op
    }
  };
  if (!messages || messages.length === 0) {
    return (
      <div className="text-center text-muted-foreground">No messages.</div>
    );
  }

  return (
    <div className={cn('mt-10 w-full')}>
      {messages.map((m, idx) => (
        <Message
          hasScrollAnchor={false}
          id={m._id}
          isLast={idx === messages.length - 1}
          key={m._id}
          metadata={m.metadata ?? {}}
          onBranch={() => {
            /* No-op: shared messages cannot be branched */
          }}
          onDelete={() => {
            /* No-op: shared messages cannot be deleted */
          }}
          onEdit={() => {
            /* No-op: shared messages cannot be edited */
          }}
          onReload={() => {
            /* No-op: shared messages cannot be reloaded */
          }}
          parts={m.parts}
          readOnly={true}
          status="ready"
          variant={m.role}
        />
      ))}
      {/* Floating CTA inspired by Zola's "Ask Zola" */}
      <div className="fixed bottom-6 left-0 z-50 flex w-full justify-center">
        <Button
          aria-label="Continue in your chat"
          className="group flex h-12 items-center justify-between rounded-full border border-border bg-background py-2 pr-2 pl-4 text-muted-foreground shadow-sm transition-all hover:scale-[1.02] hover:bg-background active:scale-[0.98]"
          onClick={onFork}
          variant="outline"
        >
          <span>Continue in your chat</span>
          <span className="rounded-full bg-black/20 p-2 backdrop-blur-sm transition-colors group-hover:bg-black/30">
            <ArrowUpRight className="h-4 w-4 text-white" />
          </span>
        </Button>
      </div>
    </div>
  );
}

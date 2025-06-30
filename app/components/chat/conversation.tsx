import type { Message as MessageType } from '@ai-sdk/react';
import React, { useRef } from 'react';
import { ScrollButton } from '@/components/motion-primitives/scroll-button';
import { ChatContainer } from '@/components/prompt-kit/chat-container';
import { Loader } from '@/components/prompt-kit/loader';
import type { MessageMetadata } from '@/lib/ai-sdk-utils';
import { Message } from './message';

type MessageWithReasoning = MessageType & {
  reasoning_text?: string;
  model?: string;
  metadata?: MessageMetadata;
};

type ConversationProps = {
  messages: MessageWithReasoning[];
  status?: 'streaming' | 'ready' | 'submitted' | 'error';
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onReload: (id: string) => void;
  onBranch: (messageId: string) => void;
  autoScroll?: boolean;
};

const Conversation = React.memo(
  ({
    messages,
    status = 'ready',
    onDelete,
    onEdit,
    onReload,
    onBranch,
    autoScroll = true,
  }: ConversationProps) => {
    const initialMessageCount = useRef(messages.length);
    const containerRef = useRef<HTMLDivElement>(null);

    if (!messages || messages.length === 0) {
      return <div className="h-full w-full" />;
    }

    return (
      <div className="relative flex h-full w-full flex-col items-center overflow-y-auto overflow-x-hidden">
        <ChatContainer
          autoScroll={autoScroll}
          className="relative flex w-full flex-col items-center pt-20 pb-4"
          ref={containerRef}
          style={{
            scrollbarGutter: 'stable both-edges',
          }}
        >
          {messages?.map((message, index) => {
            const isLast =
              index === messages.length - 1 && status !== 'submitted';
            const hasScrollAnchor =
              isLast && messages.length > initialMessageCount.current;

            return (
              <Message
                attachments={message.experimental_attachments}
                hasScrollAnchor={hasScrollAnchor}
                id={message.id}
                isLast={isLast}
                key={message.id}
                metadata={message.metadata}
                model={message.model}
                onBranch={() => onBranch(message.id)}
                onDelete={onDelete}
                onEdit={onEdit}
                onReload={() => onReload(message.id)}
                parts={message.parts}
                reasoning_text={message.reasoning_text}
                status={status}
                variant={message.role}
              >
                {message.content}
              </Message>
            );
          })}
          {status === 'submitted' &&
            messages.length > 0 &&
            messages.at(-1)?.role === 'user' && (
              <div className="group flex min-h-scroll-anchor w-full max-w-3xl flex-col items-start gap-2 px-6 pb-2">
                <Loader size="md" variant="dots" />
              </div>
            )}
        </ChatContainer>
        <div className="absolute bottom-0 w-full max-w-3xl">
          <ScrollButton
            className="absolute top-[-50px] right-[30px]"
            containerRef={containerRef}
          />
        </div>
      </div>
    );
  }
);

export { Conversation };

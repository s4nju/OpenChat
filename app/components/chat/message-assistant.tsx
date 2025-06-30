'use client';

import type { Message as MessageType } from '@ai-sdk/react';
import type {
  ReasoningUIPart,
  SourceUIPart,
  ToolInvocationUIPart,
} from '@ai-sdk/ui-utils';
import { Loader } from '@/components/prompt-kit/loader';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from '@/components/prompt-kit/message';
import type { MessageMetadata } from '@/lib/ai-sdk-utils';
import { cn } from '@/lib/utils';

// Error part type for rendering
type ErrorUIPart = {
  type: 'error';
  error: {
    code: string;
    message: string;
    rawError?: string; // Technical error for backend (not displayed)
  };
};

import {
  ArrowClockwise,
  CaretDown,
  CaretUp,
  Check,
  Copy,
  GitBranch,
  SpinnerGap,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic'; // Client component – required when using React hooks in the app router

import { memo, useEffect, useRef, useState } from 'react'; // Import React to access memo
import { SourcesList } from './sources-list';

interface Source {
  id: string;
  url: string;
  title: string;
  sourceType: 'url';
}

// Helper function to format model display with reasoning effort
const formatModelDisplayText = (modelName: string, effort?: string) => {
  if (!effort || effort === 'none') {
    return modelName;
  }
  return `${modelName} (${effort})`;
};

// Helper function to process search tool results
const processSearchToolResult = (
  inv: { toolCallId?: string; result?: unknown },
  toolCallId?: string
): Source[] => {
  if (!inv.result || typeof inv.result !== 'object' || inv.result === null) {
    return [];
  }

  const searchResult = inv.result as {
    success?: boolean;
    results?: Array<{ url?: string; title?: string }>;
  };

  if (!(searchResult.success && Array.isArray(searchResult.results))) {
    return [];
  }

  return searchResult.results
    .filter((item) => item?.url && item?.title)
    .map((item, idx: number) => ({
      id: toolCallId ? `${toolCallId}-${idx}` : `search-${idx}`,
      url: item.url ?? '',
      title: item.title ?? '',
      sourceType: 'url' as const,
    }));
};

// Helper function to process legacy duckDuckGo results
const processDuckDuckGoResult = (
  result: unknown,
  toolCallId?: string
): Source[] => {
  if (!Array.isArray(result)) {
    return [];
  }

  return (
    result as Array<{
      id?: string;
      url?: string;
      title?: string;
    }>
  )
    .filter((item) => item?.url && item?.title)
    .map((item, idx: number) => ({
      id: item.id ?? (toolCallId ? `${toolCallId}-${idx}` : `tmp-${idx}`),
      url: item.url ?? '',
      title: item.title ?? '',
      sourceType: 'url' as const,
    }));
};

// Helper function to process legacy exaSearch results
const processExaSearchResult = (
  result: unknown,
  toolCallId?: string
): Source[] => {
  if (!result || typeof result !== 'object' || result === null) {
    return [];
  }

  const exaResult = result as { results?: unknown };
  if (!Array.isArray(exaResult.results)) {
    return [];
  }

  return (
    exaResult.results as Array<{
      id?: string;
      url?: string;
      title?: string;
    }>
  )
    .filter((item) => item?.url && item?.title)
    .map((item, idx: number) => ({
      id: item.id ?? `${toolCallId}-exa-${idx}`,
      url: item.url ?? '',
      title: item.title ?? '',
      sourceType: 'url' as const,
    }));
};

// Helper function to extract sources from a single tool invocation
const extractSourcesFromToolInvocation = (
  part: ToolInvocationUIPart
): Source[] => {
  const inv = part.toolInvocation as {
    toolName?: string;
    toolCallId?: string;
    result?: unknown;
  };

  // New unified search tool
  if (inv.toolName === 'search') {
    return processSearchToolResult(inv, inv.toolCallId);
  }

  // Legacy duckDuckGo: result is array
  if (inv.toolName === 'duckDuckGo') {
    return processDuckDuckGoResult(inv.result, inv.toolCallId);
  }

  // Legacy exaSearch: result is object with results array
  if (inv.toolName === 'exaSearch') {
    return processExaSearchResult(inv.result, inv.toolCallId);
  }

  return [];
};

// Helper function to extract sources from parts
const extractSourcesFromParts = (
  combinedParts: MessageType['parts']
): Source[] => {
  if (!combinedParts) {
    return [];
  }

  // Extract sources from source parts
  const sourcesFromParts: Source[] = combinedParts
    .filter((part): part is SourceUIPart => part.type === 'source')
    .map((part) => part.source as Source);

  // Extract sources from tool-invocation results
  const sourcesFromToolInvocations: Source[] = combinedParts
    .filter(
      (part): part is ToolInvocationUIPart => part.type === 'tool-invocation'
    )
    .flatMap(extractSourcesFromToolInvocation);

  return [...sourcesFromParts, ...sourcesFromToolInvocations];
};

// Helper function to extract reasoning parts
const extractReasoningParts = (
  combinedParts: MessageType['parts']
): ReasoningUIPart[] => {
  if (!combinedParts) {
    return [];
  }

  return combinedParts.filter(
    (part): part is ReasoningUIPart => part.type === 'reasoning'
  );
};

// Helper function to extract error parts
const extractErrorParts = (
  combinedParts: MessageType['parts']
): ErrorUIPart[] => {
  if (!combinedParts) {
    return [];
  }

  return (combinedParts as unknown[]).filter(
    (part: unknown): part is ErrorUIPart =>
      typeof part === 'object' &&
      part !== null &&
      'type' in part &&
      part.type === 'error'
  );
};

// Helper function to check if any tool invocations are in progress
const getToolInvocationsInProgress = (
  combinedParts: MessageType['parts']
): ToolInvocationUIPart[] => {
  if (!combinedParts) {
    return [];
  }

  return combinedParts.filter(
    (part): part is ToolInvocationUIPart =>
      part.type === 'tool-invocation' && part.toolInvocation.state !== 'result'
  );
};

// Helper function to render reasoning section
const renderReasoningSection = (
  reasoningParts: ReasoningUIPart[],
  reasoning_text: string | undefined,
  status: string | undefined,
  showReasoning: boolean,
  setShowReasoning: (show: (prev: boolean) => boolean) => void,
  combinedReasoningMarkdown: string
) => {
  if (reasoningParts.length === 0 && !reasoning_text) {
    return null;
  }

  return (
    <div className="mb-2 w-full">
      {status === 'streaming' ? (
        <div className="flex flex-row items-center gap-2">
          <div className="font-medium text-muted-foreground text-sm">
            Reasoning
          </div>
          <div className="animate-spin">
            <SpinnerGap size={14} weight="bold" />
          </div>
        </div>
      ) : (
        <div className="flex flex-row items-center gap-2">
          <div className="font-medium text-muted-foreground text-sm">
            Reasoned for a few seconds
          </div>
          <button
            aria-label={showReasoning ? 'Hide Reasoning' : 'Show Reasoning'}
            className={cn(
              'cursor-pointer rounded-full p-1 transition hover:bg-zinc-200 dark:hover:bg-zinc-800',
              showReasoning && 'bg-zinc-200 dark:bg-zinc-800'
            )}
            onClick={() => setShowReasoning((v) => !v)}
            type="button"
          >
            {showReasoning ? (
              <CaretUp size={16} weight="bold" />
            ) : (
              <CaretDown size={16} weight="bold" />
            )}
          </button>
        </div>
      )}
      <AnimatePresence initial={false}>
        {showReasoning && (
          <motion.div
            animate={{
              opacity: 1,
              marginTop: '1rem',
              marginBottom: 0,
              height: 'auto',
            }}
            className="flex w-full flex-col gap-4 border-zinc-300 border-l pl-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
            exit={{
              opacity: 0,
              marginTop: 0,
              marginBottom: 0,
              height: 0,
            }}
            initial={{
              opacity: 0,
              marginTop: 0,
              marginBottom: 0,
              height: 0,
            }}
            key="reasoning"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {combinedReasoningMarkdown && (
              <Markdown className="prose prose-sm dark:prose-invert w-full max-w-none break-words leading-relaxed">
                {combinedReasoningMarkdown}
              </Markdown>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper function to render error parts
const renderErrorParts = (errorParts: ErrorUIPart[]) => {
  if (errorParts.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {errorParts.map((errorPart) => (
        <div
          className="mt-4 flex items-start gap-3 rounded-lg bg-red-500/15 px-4 py-3 text-red-900 text-sm dark:text-red-400"
          key={`error-${errorPart.error.code}-${errorPart.error.message}`}
          role="alert"
        >
          <div className="leading-relaxed">{errorPart.error.message}</div>
        </div>
      ))}
    </div>
  );
};

// Helper function to render search spinner
const renderSearchSpinner = (isSearching: boolean) => {
  if (!isSearching) {
    return null;
  }

  return (
    <div className="my-2 flex items-center gap-2 text-muted-foreground text-sm">
      <Loader text="Searching the web" />
    </div>
  );
};

type MessageAssistantProps = {
  children: string;
  isLast?: boolean;
  hasScrollAnchor?: boolean;
  copied?: boolean;
  copyToClipboard?: () => void;
  onReload?: () => void;
  onBranch?: () => void;
  model?: string;
  parts?: MessageType['parts'];
  attachments?: MessageType['experimental_attachments'];
  status?: 'streaming' | 'ready' | 'submitted' | 'error';
  reasoning_text?: string;
  id: string;
  metadata?: MessageMetadata;
};

const Markdown = dynamic(
  () => import('@/components/prompt-kit/markdown').then((mod) => mod.Markdown),
  { ssr: false }
);

function MessageAssistantInner({
  children,
  isLast,
  hasScrollAnchor,
  copied,
  copyToClipboard,
  onReload,
  onBranch,
  model,
  parts,
  attachments,
  status,
  reasoning_text,
  id,
  metadata,
}: MessageAssistantProps) {
  const [showReasoning, setShowReasoning] = useState(status === 'streaming');
  const prevStatusRef = useRef(status);
  const [isTouch, setIsTouch] = useState(false);

  // Extract model from metadata or use direct model prop as fallback
  const modelFromMetadata = metadata?.modelName || metadata?.modelId;
  const displayModel = modelFromMetadata || model;
  const reasoningEffort = metadata?.reasoningEffort;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  // Effect to auto-collapse reasoning when streaming finishes
  useEffect(() => {
    if (prevStatusRef.current === 'streaming' && status !== 'streaming') {
      setShowReasoning(false);
    }
    prevStatusRef.current = status;
  }, [status]);

  // Prefer `parts` prop, but fall back to `attachments` if `parts` is undefined.
  const combinedParts = (parts ?? attachments) as
    | MessageType['parts']
    | undefined;

  // Extract different types of parts using helper functions
  const reasoningParts = extractReasoningParts(combinedParts);
  const errorParts = extractErrorParts(combinedParts);
  const sources = extractSourcesFromParts(combinedParts);
  const toolInvocationsInProgress = getToolInvocationsInProgress(combinedParts);
  const isSearching = toolInvocationsInProgress.length > 0;

  // Combine reasoning parts into a single markdown string
  const combinedReasoningMarkdown =
    reasoningParts.length > 0
      ? reasoningParts.map((p) => p.reasoning).join('')
      : (reasoning_text ?? '');

  return (
    <Message
      className={cn(
        'group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2',
        hasScrollAnchor && 'min-h-scroll-anchor'
      )}
      id={id}
    >
      <div className={cn('flex w-full flex-col gap-2', isLast && 'pb-8')}>
        {renderReasoningSection(
          reasoningParts,
          reasoning_text,
          status,
          showReasoning,
          setShowReasoning,
          combinedReasoningMarkdown
        )}

        {renderErrorParts(errorParts)}

        {renderSearchSpinner(isSearching)}

        <MessageContent
          className="prose dark:prose-invert relative min-w-full bg-transparent p-0"
          markdown={true}
        >
          {children}
        </MessageContent>

        {/* Perplexity-style sources list */}
        {sources.length > 0 && <SourcesList sources={sources} />}

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
          <MessageAction
            delayDuration={0}
            side="bottom"
            tooltip="Create a new chat starting from here"
          >
            <button
              aria-label="Branch chat"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition disabled:cursor-not-allowed disabled:opacity-50"
              disabled={status === 'streaming'}
              onClick={onBranch}
              type="button"
            >
              <GitBranch className="size-4" />
            </button>
          </MessageAction>
          <MessageAction delayDuration={0} side="bottom" tooltip="Regenerate">
            <button
              aria-label="Regenerate"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition disabled:cursor-not-allowed disabled:opacity-50"
              disabled={status === 'streaming'}
              onClick={onReload}
              type="button"
            >
              <ArrowClockwise className="size-4" />
            </button>
          </MessageAction>
          {displayModel && (
            <span className="ml-2 inline-block text-muted-foreground text-xs">
              {formatModelDisplayText(displayModel, reasoningEffort)}
            </span>
          )}
        </MessageActions>
      </div>
    </Message>
  );
}

// Default shallow comparison is fine – re-render will happen whenever
// `parts`, `attachments`, `status`, or any primitive prop reference changes
// which is what we want during streaming.
export const MessageAssistant = memo(MessageAssistantInner);

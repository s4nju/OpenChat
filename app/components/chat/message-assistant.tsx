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
  FilePdf,
  GitBranch,
  SpinnerGap,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic'; // Client component – required when using React hooks in the app router
import Image from 'next/image';

import { memo, useEffect, useRef, useState } from 'react'; // Import React to access memo
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTrigger,
} from '@/components/motion-primitives/morphing-dialog';
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

// File part type for rendering
type FileUIPart = {
  type: 'file';
  data: string;
  filename?: string;
  mimeType?: string;
  url?: string;
};

// Helper function to extract file parts
const extractFileParts = (
  combinedParts: MessageType['parts']
): FileUIPart[] => {
  if (!combinedParts) {
    return [];
  }

  return (combinedParts as unknown[]).filter(
    (part: unknown): part is FileUIPart =>
      typeof part === 'object' &&
      part !== null &&
      'type' in part &&
      part.type === 'file'
  );
};

// Helper function to get text from data URL
const getTextFromDataUrl = (dataUrl: string) => {
  const base64 = dataUrl.split(',')[1];
  return base64;
};

// Helper function to render different file types
const renderFilePart = (filePart: FileUIPart, index: number) => {
  const displayUrl = filePart.url || filePart.data;
  const filename = filePart.filename || `file-${index}`;
  const mimeType = filePart.mimeType || 'application/octet-stream';

  if (mimeType.startsWith('image')) {
    return (
      <MorphingDialog
        key={`file-${index}`}
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 18,
          mass: 0.3,
        }}
      >
        <MorphingDialogTrigger className="z-10">
          <Image
            alt={filename}
            className="mb-1 rounded-md"
            height={300}
            src={displayUrl}
            width={300}
          />
        </MorphingDialogTrigger>
        <MorphingDialogContainer>
          <MorphingDialogContent className="relative rounded-lg">
            <MorphingDialogImage
              alt={filename}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              src={displayUrl}
            />
          </MorphingDialogContent>
          <MorphingDialogClose className="text-primary" />
        </MorphingDialogContainer>
      </MorphingDialog>
    );
  }

  if (mimeType.startsWith('text')) {
    return (
      <div
        className="mb-3 h-24 w-40 overflow-hidden rounded-md border p-2 text-primary text-xs"
        key={`file-${index}`}
      >
        {getTextFromDataUrl(displayUrl)}
      </div>
    );
  }

  if (mimeType === 'application/pdf') {
    return (
      <a
        aria-label={`Download PDF: ${filename}`}
        className="mb-2 flex w-35 cursor-pointer flex-col justify-between rounded-lg border border-gray-200 bg-muted px-4 py-2 shadow-sm transition-colors hover:bg-muted/80 focus:bg-muted/70 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:focus:bg-zinc-800 dark:hover:bg-zinc-700"
        download={filename}
        href={displayUrl}
        key={`file-${index}`}
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
            title={filename}
          >
            {filename}
          </span>
        </div>
      </a>
    );
  }

  return null;
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
  const fileParts = extractFileParts(combinedParts);
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

        {/* Render text content only if it's not empty */}
        {children.trim() && (
          <MessageContent
            className="prose dark:prose-invert relative min-w-full bg-transparent p-0"
            markdown={true}
          >
            {children}
          </MessageContent>
        )}

        {/* Render file parts (images, PDFs, etc.) */}
        {fileParts.length > 0 && (
          <div className="flex w-full flex-wrap gap-2">
            {fileParts.map((filePart, index) =>
              renderFilePart(filePart, index)
            )}
          </div>
        )}

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

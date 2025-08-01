'use client';

import type { UIMessage as MessageType } from '@ai-sdk/react';
import type {
  FileUIPart,
  ReasoningUIPart,
  SourceUrlUIPart,
  ToolUIPart,
} from 'ai';
import type { Infer } from 'convex/values';
import { Loader } from '@/components/prompt-kit/loader';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from '@/components/prompt-kit/message';
import type { Message as MessageSchema } from '@/convex/schema/message';
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

// Type guard for error parts
const isErrorPart = (part: unknown): part is ErrorUIPart => {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    part.type === 'error' &&
    'error' in part &&
    typeof part.error === 'object' &&
    part.error !== null &&
    'code' in part.error &&
    typeof part.error.code === 'string' &&
    'message' in part.error &&
    typeof part.error.message === 'string'
  );
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
import { ConnectorToolCall } from '@/app/components/tool/connector_tool_call';
import { UnifiedSearch } from '@/app/components/tool/web_search';
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTrigger,
} from '@/components/motion-primitives/morphing-dialog';
import {
  getConnectorTypeFromToolName,
  isConnectorTool,
} from '@/lib/config/tools';
import type { ConnectorType } from '@/lib/types';
import { SourcesList } from './sources-list';

// Helper function to format model display with reasoning effort
const formatModelDisplayText = (modelName: string, effort?: string) => {
  if (!effort || effort === 'none') {
    return modelName;
  }
  return `${modelName} (${effort})`;
};

// Helper function to extract sources from parts
const extractSourcesFromParts = (
  combinedParts: MessageType['parts']
): SourceUrlUIPart[] => {
  if (!combinedParts) {
    return [];
  }

  // Process both 'source-url' and 'tool-search' parts
  return combinedParts.flatMap((part): SourceUrlUIPart[] => {
    // Handle standard source URLs
    if (part.type === 'source-url') {
      return [part];
    }

    // Handle search results from the search tool
    if (
      part.type === 'tool-search' &&
      'state' in part &&
      part.state === 'output-available' &&
      'output' in part &&
      part.output &&
      typeof part.output === 'object' &&
      'results' in part.output &&
      Array.isArray((part.output as { results: unknown }).results)
    ) {
      // Type assertion for safety
      const toolPart = part as ToolUIPart & {
        output: { results: Array<{ url: string; title: string }> };
      };

      // console.log('Tool search results:', toolPart.output.results[0].title);

      return toolPart.output.results.map((result) => ({
        sourceId: result.url, // Use URL as sourceId
        type: 'source-url',
        url: result.url,
        title: result.title, // Use title for display
      }));
    }

    // Return empty for other part types
    return [];
  });
};

// Helper function to extract search query from parts
const extractSearchQueryFromParts = (
  combinedParts: MessageType['parts']
): string | null => {
  if (!combinedParts) {
    return null;
  }

  for (const part of combinedParts) {
    if (
      part.type === 'tool-search' &&
      'input' in part &&
      part.input &&
      typeof part.input === 'object' &&
      'query' in part.input
    ) {
      return part.input.query as string;
    }
  }

  return null;
};

// Helper function to render different file types
const renderFilePart = (filePart: FileUIPart, index: number) => {
  const displayUrl = filePart.url;
  const filename = filePart.filename || `file-${index}`;
  const mediaType = filePart.mediaType || 'application/octet-stream';

  if (mediaType.startsWith('image')) {
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

  if (mediaType.startsWith('text')) {
    return (
      <a
        aria-label={`Download text file: ${filename}`}
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
        <div className="flex items-center gap-2">
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

  if (mediaType === 'application/pdf') {
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

type MessageAssistantProps = {
  isLast?: boolean;
  hasScrollAnchor?: boolean;
  copied?: boolean;
  copyToClipboard?: () => void;
  onReload?: () => void;
  onBranch?: () => void;
  model?: string;
  parts?: MessageType['parts'];
  status?: 'streaming' | 'ready' | 'submitted' | 'error';
  id: string;
  metadata?: Infer<typeof MessageSchema>['metadata'];
};

const Markdown = dynamic(
  () => import('@/components/prompt-kit/markdown').then((mod) => mod.Markdown),
  { ssr: false }
);

// Individual part renderers for sequential rendering
const renderTextPart = (
  part: { type: 'text'; text: string },
  index: number,
  id: string
) => {
  if (!part.text.trim()) {
    return null;
  }

  return (
    <MessageContent
      className="prose dark:prose-invert relative min-w-full bg-transparent p-0"
      id={`${id}-text-${index}`}
      key={`text-${index}`}
      markdown={true}
    >
      {part.text}
    </MessageContent>
  );
};

const renderReasoningPart = (
  part: ReasoningUIPart,
  index: number,
  id: string,
  showReasoning: boolean,
  toggleReasoning: () => void,
  isPartStreaming: boolean
) => {
  return (
    <div className="mb-2 w-full" key={`reasoning-${index}`}>
      {isPartStreaming ? (
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
            onClick={toggleReasoning}
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
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Markdown
              className="prose prose-sm dark:prose-invert w-full max-w-none break-words leading-relaxed"
              id={`${id}-reasoning-${index}`}
            >
              {part.text}
            </Markdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const renderToolPart = (part: ToolUIPart, index: number, _id: string) => {
  const toolName = part.type.replace('tool-', '');

  // Handle search tools
  if (toolName === 'search') {
    const searchQuery = extractSearchQueryFromParts([part]);

    // For in-progress search tools, show loading state
    if ('state' in part && part.state !== 'output-available') {
      if (searchQuery) {
        return (
          <UnifiedSearch
            isLoading={true}
            key={`search-loading-${index}`}
            query={searchQuery}
          />
        );
      }
      // Fallback to original loader if no query is available
      return (
        <div
          className="my-2 flex items-center gap-2 text-muted-foreground text-sm"
          key={`tool-${index}`}
        >
          <Loader text="Searching the web" />
        </div>
      );
    }

    // For completed search tools, render the unified search component with results
    if ('state' in part && part.state === 'output-available') {
      const sources = extractSourcesFromParts([part]);

      if (searchQuery) {
        return (
          <UnifiedSearch
            isLoading={false}
            key={`search-results-${index}`}
            query={searchQuery}
            sources={sources}
          />
        );
      }
    }
  }

  // Handle connector tool calls (Composio tools)
  const isConnectorToolCall = isConnectorTool(toolName);

  if (isConnectorToolCall) {
    // Determine connector type from tool name
    const connectorType = getConnectorTypeFromToolName(toolName);

    // Handle different tool states based on AI SDK v5 ToolUIPart states
    if ('state' in part) {
      const isLoading =
        part.state === 'input-streaming' || part.state === 'input-available';
      const hasCompleted = part.state === 'output-available';
      const hasError = part.state === 'output-error';

      // Extract tool call data based on state
      const toolCallData: {
        toolName: string;
        connectorType: ConnectorType;
        request?: {
          action: string;
          parameters?: Record<string, unknown>;
        };
        response?: {
          success: boolean;
          data?: unknown;
          error?: string;
        };
        metadata?: {
          executionTime?: number;
          timestamp?: string;
        };
      } = {
        toolName,
        connectorType,
      };

      // Extract input/arguments if available
      if ('input' in part && part.input) {
        toolCallData.request = {
          action: toolName,
          parameters: part.input as Record<string, unknown>,
        };
      }

      // Extract output/result if available
      if (hasCompleted && 'output' in part && part.output) {
        toolCallData.response = {
          success: true,
          data: part.output,
        };
      } else if (hasError && 'error' in part && part.error) {
        toolCallData.response = {
          success: false,
          error:
            typeof part.error === 'string'
              ? part.error
              : 'Tool execution failed',
        };
      }

      // Add metadata
      toolCallData.metadata = {
        timestamp: new Date().toISOString(),
      };

      return (
        <ConnectorToolCall
          data={toolCallData}
          isLoading={isLoading}
          key={`connector-${part.state}-${index}`}
        />
      );
    }

    // Fallback for connector tools without proper state (shouldn't happen with AI SDK v5)
    const fallbackData: {
      toolName: string;
      connectorType: ConnectorType;
      request?: {
        action: string;
        parameters?: Record<string, unknown>;
      };
      response?: {
        success: boolean;
        data?: unknown;
        error?: string;
      };
      metadata?: {
        executionTime?: number;
        timestamp?: string;
      };
    } = {
      toolName,
      connectorType,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return (
      <ConnectorToolCall
        data={fallbackData}
        isLoading={false}
        key={`connector-fallback-${index}`}
      />
    );
  }

  return null;
};

const renderErrorPart = (part: ErrorUIPart, index: number) => {
  return (
    <div
      className="mt-4 flex items-start gap-3 rounded-lg bg-red-500/15 px-4 py-3 text-red-900 text-sm dark:text-red-400"
      key={`error-${index}`}
      role="alert"
    >
      <div className="leading-relaxed">{part.error.message}</div>
    </div>
  );
};

function MessageAssistantInner({
  isLast,
  hasScrollAnchor,
  copied,
  copyToClipboard,
  onReload,
  onBranch,
  model,
  parts,
  status,
  id,
  metadata,
}: MessageAssistantProps) {
  // Prefer `parts` prop, but fall back to `attachments` if `parts` is undefined.
  const combinedParts = parts || [];

  // State for reasoning collapse/expand functionality - track each reasoning part individually
  const [reasoningStates, setReasoningStates] = useState<
    Record<string, boolean>
  >({});
  // Track which reasoning parts were initially streaming (to show correct UI)
  const [reasoningStreamingStates, setReasoningStreamingStates] = useState<
    Record<string, boolean>
  >({});
  const prevStatusRef = useRef(status);
  const initialStatusRef = useRef<Record<string, boolean>>({});
  const [isTouch, setIsTouch] = useState(false);

  // Initialize reasoning states - only run once when reasoning parts are first detected
  useEffect(() => {
    if (combinedParts) {
      setReasoningStates((prevStates) => {
        const newStates = { ...prevStates };
        let hasChanges = false;

        combinedParts.forEach((part, index) => {
          if (part.type === 'reasoning') {
            const key = `${id}-${index}`;
            if (!(key in newStates)) {
              // Check if we have a stored initial status, otherwise use current status
              const isInitiallyStreaming =
                initialStatusRef.current[key] ?? status === 'streaming';
              newStates[key] = isInitiallyStreaming;
              hasChanges = true;
            }
          }
        });

        return hasChanges ? newStates : prevStates;
      });

      // Track which reasoning parts were initially streaming
      setReasoningStreamingStates((prevStreamingStates) => {
        const newStreamingStates = { ...prevStreamingStates };
        let hasChanges = false;

        combinedParts.forEach((part, index) => {
          if (part.type === 'reasoning') {
            const key = `${id}-${index}`;
            if (!(key in newStreamingStates)) {
              const isInitiallyStreaming = status === 'streaming';
              newStreamingStates[key] = isInitiallyStreaming;
              // Store the initial status in ref to avoid re-initialization
              initialStatusRef.current[key] = isInitiallyStreaming;
              hasChanges = true;
            }
          }
        });

        return hasChanges ? newStreamingStates : prevStreamingStates;
      });
    }
  }, [combinedParts, id, status]);

  // Extract model from metadata or use direct model prop as fallback
  const modelFromMetadata = metadata?.modelName || metadata?.modelId;
  const displayModel = modelFromMetadata || model;
  const reasoningEffort = metadata?.reasoningEffort;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  // Effect to auto-collapse all reasoning when streaming finishes
  useEffect(() => {
    if (prevStatusRef.current === 'streaming' && status !== 'streaming') {
      // Collapse reasoning parts for this message
      setReasoningStates((prev) => {
        const newStates = { ...prev };
        for (const key of Object.keys(newStates)) {
          if (key.startsWith(`${id}-`)) {
            newStates[key] = false;
          }
        }
        return newStates;
      });

      // Clear streaming states for this message (so they show buttons instead of spinners)
      setReasoningStreamingStates((prev) => {
        const newStates = { ...prev };
        for (const key of Object.keys(newStates)) {
          if (key.startsWith(`${id}-`)) {
            newStates[key] = false;
          }
        }
        return newStates;
      });
    }
    prevStatusRef.current = status;
  }, [status, id]);

  // Helper function to toggle individual reasoning part
  const toggleReasoning = (index: number) => {
    const key = `${id}-${index}`;
    setReasoningStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <Message
      className={cn(
        'group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2',
        hasScrollAnchor && 'min-h-scroll-anchor'
      )}
      id={id}
    >
      <div className={cn('flex w-full flex-col gap-2', isLast && 'pb-8')}>
        {/* Sequential rendering of all parts in stream order */}
        {combinedParts?.map((part, index) => {
          const partKey = `${part.type}-${index}`;

          switch (part.type) {
            case 'text':
              return renderTextPart(
                part as { type: 'text'; text: string },
                index,
                id
              );

            case 'reasoning':
              return renderReasoningPart(
                part as ReasoningUIPart,
                index,
                id,
                reasoningStates[`${id}-${index}`],
                () => toggleReasoning(index),
                reasoningStreamingStates[`${id}-${index}`]
              );

            case 'file':
              return (
                <div className="flex w-full flex-wrap gap-2" key={partKey}>
                  {renderFilePart(part as FileUIPart, index)}
                </div>
              );

            default:
              // Handle tool parts (tool-search, tool-*, etc.)
              if (part.type.startsWith('tool-')) {
                return renderToolPart(part as ToolUIPart, index, id);
              }
              // Handle error parts (not in UIMessage union type but may exist)
              if (isErrorPart(part)) {
                return renderErrorPart(part, index);
              }
              return null;
          }
        })}

        {/* Render sources list for non-search sources only */}
        {(() => {
          // Get all sources
          const allSources = extractSourcesFromParts(combinedParts);
          const searchQuery = extractSearchQueryFromParts(combinedParts);

          // If we have search sources, they are already rendered inline, so skip them
          if (searchQuery && allSources.length > 0) {
            return null;
          }

          // Only render SourcesList for non-search sources
          return allSources.length > 0 ? (
            <SourcesList sources={allSources} />
          ) : null;
        })()}

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

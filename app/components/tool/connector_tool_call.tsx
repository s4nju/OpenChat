'use client';

import { CaretDown, Copy, SpinnerGap } from '@phosphor-icons/react';
import Image from 'next/image';
import { memo, useCallback, useMemo, useState } from 'react';
import type { ConnectorType } from '@/lib/composio-utils';
import { cn } from '@/lib/utils';

// Types for connector tool calls
type ConnectorToolCallData = {
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
};

type ConnectorToolCallProps = {
  data: ConnectorToolCallData;
  className?: string;
  isLoading?: boolean;
};

// Connector icons mapping
const getConnectorIcon = (connectorType: ConnectorType): string => {
  const iconMap: Record<ConnectorType, string> = {
    gmail: 'https://www.google.com/s2/favicons?domain=gmail.com&sz=48',
    googlecalendar:
      'https://www.google.com/s2/favicons?domain=calendar.google.com&sz=48',
    notion: 'https://www.google.com/s2/favicons?domain=notion.com&sz=48',
    googledrive:
      'https://www.google.com/s2/favicons?domain=drive.google.com&sz=48',
  };
  return (
    iconMap[connectorType] ||
    `https://www.google.com/s2/favicons?domain=${connectorType}.com&sz=48`
  );
};

// Format connector type for display
const formatConnectorType = (connectorType: ConnectorType): string => {
  const displayNames: Record<ConnectorType, string> = {
    gmail: 'Gmail',
    googlecalendar: 'Google Calendar',
    notion: 'Notion',
    googledrive: 'Google Drive',
  };
  return displayNames[connectorType] || connectorType;
};

// Copy to clipboard functionality
const CopyButton = memo<{ content: string; size?: number }>(
  ({ content, size = 12 }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (_error) {
        // Silently handle clipboard error
      }
    }, [content]);

    return (
      <button
        aria-label="Copy to clipboard"
        className={cn(
          'relative inline-flex shrink-0 select-none items-center justify-center',
          'disabled:pointer-events-none disabled:opacity-50',
          'border-transparent font-ui text-muted-foreground tracking-tight transition',
          'duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)]',
          'hover:bg-accent hover:text-foreground',
          'h-6 w-6 rounded-md active:scale-95'
        )}
        onClick={handleCopy}
        type="button"
      >
        <div className="relative flex">
          <div
            className={cn(
              'flex items-center justify-center text-muted-foreground transition-all',
              copied ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
            )}
            style={{ width: `${size}px`, height: `${size}px` }}
          >
            <Copy size={size} />
          </div>
          <div
            className={cn(
              'absolute top-0 left-0 flex items-center justify-center text-muted-foreground transition-all',
              copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            )}
            style={{ width: `${size}px`, height: `${size}px` }}
          >
            <svg
              aria-hidden="true"
              className="shrink-0"
              fill="currentColor"
              height={size}
              viewBox="0 0 20 20"
              width={size}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M15.1883 5.10908C15.3699 4.96398 15.6346 4.96153 15.8202 5.11592C16.0056 5.27067 16.0504 5.53125 15.9403 5.73605L15.8836 5.82003L8.38354 14.8202C8.29361 14.9279 8.16242 14.9925 8.02221 14.9989C7.88203 15.0051 7.74545 14.9526 7.64622 14.8534L4.14617 11.3533L4.08172 11.2752C3.95384 11.0811 3.97542 10.817 4.14617 10.6463C4.31693 10.4755 4.58105 10.4539 4.77509 10.5818L4.85321 10.6463L7.96556 13.7586L15.1161 5.1794L15.1883 5.10908Z" />
            </svg>
          </div>
        </div>
      </button>
    );
  }
);

CopyButton.displayName = 'CopyButton';

// Format JSON for display with syntax highlighting
const formatJsonContent = (data: unknown): string => {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data, null, 2);
};

// Main component
export const ConnectorToolCall = memo<ConnectorToolCallProps>(
  ({ data, className, isLoading = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Memoized values
    const connectorIcon = useMemo(
      () => getConnectorIcon(data.connectorType),
      [data.connectorType]
    );
    const connectorDisplayName = useMemo(
      () => formatConnectorType(data.connectorType),
      [data.connectorType]
    );

    const displayText = useMemo(() => {
      if (isLoading) {
        return `Executing ${data.toolName}...`;
      }
      return data.request?.action || data.toolName;
    }, [isLoading, data.toolName, data.request?.action]);

    const statusText = useMemo(() => {
      if (isLoading) {
        return 'Running';
      }
      if (data.response?.error) {
        return 'Failed';
      }
      if (data.response?.success) {
        return 'Success';
      }
      return 'Completed';
    }, [isLoading, data.response]);

    const buttonClassName = useMemo(() => {
      return cn(
        'group/row flex h-[2.625rem] flex-row items-center justify-between gap-4 rounded-lg px-3 py-2',
        'text-muted-foreground transition-colors duration-200',
        isLoading ? 'cursor-default' : 'cursor-pointer hover:text-foreground'
      );
    }, [isLoading]);

    const caretClassName = useMemo(() => {
      return cn(
        'flex transform items-center justify-center text-muted-foreground transition-transform duration-400 ease-out',
        isExpanded ? '-rotate-180' : 'rotate-0'
      );
    }, [isExpanded]);

    const resultsClassName = useMemo(() => {
      return cn(
        'shrink-0 overflow-hidden transition-all duration-400 ease-out',
        isExpanded ? 'opacity-100' : 'opacity-0'
      );
    }, [isExpanded]);

    const handleToggleExpanded = useCallback(() => {
      if (!isLoading) {
        setIsExpanded((prev) => !prev);
      }
    }, [isLoading]);

    const requestContent = useMemo(() => {
      return formatJsonContent(data.request);
    }, [data.request]);

    const responseContent = useMemo(() => {
      return formatJsonContent(data.response);
    }, [data.response]);

    return (
      <div className={cn('my-3 w-full', className)}>
        <div className="flex min-h-[2.625rem] flex-col rounded-lg border bg-card font-ui leading-normal tracking-tight shadow-sm transition-all duration-400 ease-out">
          {/* Toggle Button Header */}
          <button
            className={buttonClassName}
            disabled={isLoading}
            onClick={handleToggleExpanded}
            type="button"
          >
            <div className="flex min-w-0 flex-row items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center text-muted-foreground">
                <Image
                  alt="connector icon"
                  className="rounded-sm opacity-100 transition duration-500"
                  decoding="async"
                  height={18}
                  loading="lazy"
                  src={connectorIcon}
                  style={{
                    color: 'transparent',
                    maxWidth: '18px',
                    maxHeight: '18px',
                  }}
                  unoptimized
                  width={18}
                />
              </div>
              <div className="relative bottom-[0.5px] flex-grow overflow-hidden overflow-ellipsis whitespace-nowrap text-left text-muted-foreground leading-tight">
                {displayText}
              </div>
            </div>
            <div className="flex min-w-0 shrink-0 flex-row items-center gap-1.5">
              {isLoading ? (
                <div className="animate-spin">
                  <SpinnerGap size={16} weight="bold" />
                </div>
              ) : (
                <>
                  <div className="shrink-0 whitespace-nowrap text-muted-foreground text-sm leading-tight">
                    {connectorDisplayName}
                  </div>
                  <div
                    className={caretClassName}
                    style={{ width: '16px', height: '16px' }}
                  >
                    <CaretDown size={20} />
                  </div>
                </>
              )}
            </div>
          </button>

          {/* Collapsible Results */}
          {!isLoading && (
            <div
              className={resultsClassName}
              style={{
                height: isExpanded ? 'auto' : 0,
              }}
              tabIndex={-1}
            >
              <div
                style={{
                  WebkitMaskImage:
                    'linear-gradient(transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)',
                  maskImage:
                    'linear-gradient(transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)',
                }}
              >
                <div
                  className="h-full max-h-[238px] overflow-y-auto overflow-x-hidden"
                  style={{ scrollbarGutter: 'stable' }}
                  tabIndex={-1}
                >
                  <div className="flex flex-col gap-3 p-3 pt-1">
                    {/* Request Section */}
                    {data.request && (
                      <div className="flex flex-col gap-3 rounded-md bg-muted p-3">
                        <div className="flex h-3 items-center justify-between">
                          <p className="font-medium font-ui text-[0.6875rem] text-muted-foreground tracking-tight">
                            Request
                          </p>
                          <CopyButton content={requestContent} />
                        </div>
                        <div className="max-h-32 overflow-auto font-mono text-sm leading-relaxed">
                          <pre className="whitespace-pre-wrap">
                            {requestContent}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Response Section */}
                    {data.response && (
                      <div className="flex flex-col gap-3 rounded-md bg-muted p-3">
                        <div className="flex h-3 items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="font-medium font-ui text-[0.6875rem] text-muted-foreground tracking-tight">
                              Response
                            </p>
                            <div
                              className={cn(
                                'rounded px-1.5 py-0.5 font-medium text-[0.6875rem]',
                                (() => {
                                  if (data.response.error) {
                                    return 'bg-destructive/10 text-destructive';
                                  }
                                  if (data.response.success) {
                                    return 'bg-green-100 text-green-700';
                                  }
                                  return 'bg-secondary text-secondary-foreground';
                                })()
                              )}
                            >
                              {statusText}
                            </div>
                          </div>
                          <CopyButton content={responseContent} />
                        </div>
                        <div className="max-h-32 overflow-auto font-mono text-sm leading-relaxed">
                          <pre className="whitespace-pre-wrap">
                            {responseContent}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Metadata Section */}
                    {data.metadata && (
                      <div className="flex flex-col gap-2 rounded-md bg-muted p-3">
                        <p className="font-medium font-ui text-[0.6875rem] text-muted-foreground tracking-tight">
                          Metadata
                        </p>
                        <div className="space-y-1 text-muted-foreground text-xs">
                          {data.metadata.executionTime && (
                            <div className="flex justify-between">
                              <span>Execution Time:</span>
                              <span className="font-mono">
                                {data.metadata.executionTime}ms
                              </span>
                            </div>
                          )}
                          {data.metadata.timestamp && (
                            <div className="flex justify-between">
                              <span>Timestamp:</span>
                              <span className="font-mono">
                                {data.metadata.timestamp}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Connector:</span>
                            <span className="font-mono">
                              {data.connectorType}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tool:</span>
                            <span className="font-mono">{data.toolName}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ConnectorToolCall.displayName = 'ConnectorToolCall';

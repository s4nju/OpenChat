'use client';

import { convexQuery } from '@convex-dev/react-query';
import { ClockIcon, XIcon } from '@phosphor-icons/react';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import Link from 'next/link';
import { memo, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

type ExecutionHistoryDialogProps = {
  taskId: Id<'scheduled_tasks'>;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
};

// Static constants for better performance
const STATUS_CONFIG = {
  pending: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Pending',
    icon: '⏸️',
  },
  running: {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    label: 'Running',
    icon: '🔄',
  },
  success: {
    color: 'bg-green-100 text-green-800 border-green-200',
    label: 'Success',
    icon: '✅',
  },
  failure: {
    color: 'bg-red-100 text-red-800 border-red-200',
    label: 'Failed',
    icon: '❌',
  },
  cancelled: {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'Cancelled',
    icon: '⏹️',
  },
  timeout: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    label: 'Timeout',
    icon: '⏱️',
  },
} as const;

function ExecutionHistoryDialogComponent({
  taskId,
  taskTitle,
  isOpen,
  onClose,
}: ExecutionHistoryDialogProps) {
  // Memoized query configuration
  const historyQueryConfig = useMemo(
    () => ({
      ...convexQuery(api.task_history.getTaskExecutionHistory, { taskId }),
      enabled: isOpen,
      gcTime: 5 * 60 * 1000, // 5 minutes
    }),
    [taskId, isOpen]
  );

  const statsQueryConfig = useMemo(
    () => ({
      ...convexQuery(api.task_history.getTaskExecutionStats, { taskId }),
      enabled: isOpen,
      gcTime: 5 * 60 * 1000, // 5 minutes
    }),
    [taskId, isOpen]
  );

  const { data: history = [], isLoading: isHistoryLoading } =
    useTanStackQuery(historyQueryConfig);
  const { data: stats, isLoading: isStatsLoading } =
    useTanStackQuery(statsQueryConfig);

  // Memoized formatters
  const formatTime = useMemo(() => {
    return (timestamp: number) => format(new Date(timestamp), 'MMM d, h:mm a');
  }, []);

  const formatDuration = useMemo(() => {
    return (startTime: number, endTime?: number) => {
      if (!endTime) {
        return 'Running...';
      }
      const duration = endTime - startTime;
      const seconds = Math.round(duration / 1000);
      if (seconds < 60) {
        return `${seconds}s`;
      }
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    };
  }, []);

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="max-h-[80vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Execution History: {taskTitle}
          </DialogTitle>
          <DialogDescription>
            View detailed execution history and statistics for this scheduled
            task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics Section */}
          {!isStatsLoading && stats && (
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 md:grid-cols-5">
              <div className="text-center">
                <div className="font-semibold text-2xl">
                  {stats.totalExecutions}
                </div>
                <div className="text-muted-foreground text-sm">Total Runs</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-2xl text-green-600">
                  {stats.successRate}%
                </div>
                <div className="text-muted-foreground text-sm">
                  Success Rate
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-2xl text-green-600">
                  {stats.successfulExecutions}
                </div>
                <div className="text-muted-foreground text-sm">Successful</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-2xl text-red-600">
                  {stats.failedExecutions}
                </div>
                <div className="text-muted-foreground text-sm">Failed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-2xl text-orange-600">
                  {stats.runningExecutions}
                </div>
                <div className="text-muted-foreground text-sm">Running</div>
              </div>
            </div>
          )}

          {/* History List */}
          <div className="space-y-2">
            <h3 className="font-medium text-lg">Recent Executions</h3>
            <ScrollArea className="h-[400px] w-full">
              {isHistoryLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      className="h-16 animate-pulse rounded-lg bg-muted/50"
                      // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items
                      key={i}
                    />
                  ))}
                </div>
              )}

              {!isHistoryLoading && history.length === 0 && (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No execution history found for this task.
                </div>
              )}

              {!isHistoryLoading && history.length > 0 && (
                <div className="space-y-2 pr-4">
                  {history.map((execution) => {
                    const statusConfig = STATUS_CONFIG[execution.status];
                    const duration = formatDuration(
                      execution.startTime,
                      execution.endTime
                    );

                    return (
                      <div
                        className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/20"
                        key={execution._id}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-xs ${statusConfig.color}`}
                              variant="secondary"
                            >
                              <span className="mr-1">{statusConfig.icon}</span>
                              {statusConfig.label}
                            </Badge>
                            {execution.isManualTrigger && (
                              <Badge className="text-xs" variant="outline">
                                Manual
                              </Badge>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">
                              {formatTime(execution.startTime)}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Duration: {duration}
                              {execution.metadata?.totalTokens && (
                                <span className="ml-2">
                                  •{' '}
                                  {execution.metadata.totalTokens.toLocaleString()}{' '}
                                  tokens
                                </span>
                              )}
                            </div>
                            {execution.errorMessage && (
                              <div className="mt-1 truncate text-red-600 text-xs">
                                Error: {execution.errorMessage}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {execution.chatId && (
                            <Link href={`/c/${execution.chatId}`}>
                              <Button size="sm" variant="outline">
                                View Results
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            <XIcon className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ExecutionHistoryDialog = memo(
  ExecutionHistoryDialogComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.taskId === nextProps.taskId &&
      prevProps.taskTitle === nextProps.taskTitle &&
      prevProps.isOpen === nextProps.isOpen
    );
  }
);

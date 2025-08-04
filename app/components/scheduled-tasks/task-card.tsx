'use client';

import {
  ArchiveIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  RepeatOnceIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useMutation } from 'convex/react';
import { format } from 'date-fns';
import Link from 'next/link';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { api } from '@/convex/_generated/api';
import { TaskDialog } from './task-dialog';
import type { ScheduledTask } from './types';

// Static constants moved outside component for better performance
const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const SCHEDULE_TYPE_DISPLAY_MAP = {
  onetime: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
} as const;

type TaskCardProps = {
  task: ScheduledTask;
};

function TaskCardComponent({ task }: TaskCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const deleteTask = useMutation(api.scheduled_tasks.deleteScheduledTask);
  const updateTask = useMutation(api.scheduled_tasks.updateScheduledTask);
  const triggerTask = useMutation(api.scheduled_tasks.triggerScheduledTask);

  const handleDelete = async () => {
    try {
      await deleteTask({ taskId: task._id });
      toast.success('Task deleted successfully');
    } catch (_error) {
      toast.error('Failed to delete task');
    }
    setShowDeleteDialog(false);
  };

  const handlePauseResume = async () => {
    try {
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      await updateTask({
        taskId: task._id,
        status: newStatus,
      });
      toast.success(task.status === 'active' ? 'Task paused' : 'Task resumed');
    } catch (_error) {
      toast.error(
        `Failed to ${task.status === 'active' ? 'pause' : 'resume'} task`
      );
    }
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    // Toast is already shown by the form component
  };

  // const handleCopy = () => {
  //   navigator.clipboard.writeText(task.prompt);
  //   toast.success('Task prompt copied to clipboard');
  // };

  const handleTriggerNow = async () => {
    try {
      await triggerTask({ taskId: task._id });
      toast.success('Task triggered successfully');
    } catch (_error) {
      toast.error('Failed to trigger task');
    }
  };

  // Memoized schedule display computation
  const scheduleDisplay = useMemo(() => {
    return (
      SCHEDULE_TYPE_DISPLAY_MAP[
        task.scheduleType as keyof typeof SCHEDULE_TYPE_DISPLAY_MAP
      ] || task.scheduleType
    );
  }, [task.scheduleType]);

  // Memoized weekly day computation
  const weeklyDay = useMemo(() => {
    if (task.scheduleType !== 'weekly') {
      return null;
    }

    const parts = task.scheduledTime.split(':');
    if (parts.length < 3) {
      return null;
    }

    const dayNumber = Number.parseInt(parts[0], 10);
    return DAY_NAMES[dayNumber] || null;
  }, [task.scheduleType, task.scheduledTime]);

  // Memoized time formatting function
  const formatTime = useCallback((timestamp: number | undefined) => {
    if (!timestamp) {
      return 'Never';
    }
    return format(new Date(timestamp), 'MMM d, h:mm a');
  }, []);

  // Memoized next execution display
  const nextExecutionDisplay = useMemo(() => {
    switch (task.status) {
      case 'active':
        return formatTime(task.nextExecution);
      case 'running':
        return 'Currently running';
      case 'paused':
        return 'Paused';
      case 'archived':
        return 'Archived';
      default:
        return 'Unknown';
    }
  }, [task.status, task.nextExecution, formatTime]);

  // Memoized last execution display
  const lastExecutionDisplay = useMemo(() => {
    return formatTime(task.lastExecuted);
  }, [task.lastExecuted, formatTime]);

  // Memoized tooltip content
  const tooltipContent = useMemo(() => {
    switch (task.status) {
      case 'active':
        return 'Pause task';
      case 'paused':
        return 'Resume task';
      case 'running':
        return 'Task is running';
      case 'archived':
        return 'Task is archived';
      default:
        return 'Unknown status';
    }
  }, [task.status]);

  // Memoized archive handler
  const handleArchive = useCallback(async () => {
    try {
      await updateTask({
        taskId: task._id,
        status: 'archived',
      });
      toast.success('Task archived successfully');
    } catch (_error) {
      toast.error('Failed to archive task');
    }
  }, [updateTask, task._id]);

  // Memoized TaskDialog initialData to prevent recreating object on every render
  const taskDialogInitialData = useMemo(
    () => ({
      taskId: task._id,
      title: task.title,
      prompt: task.prompt,
      scheduleType: task.scheduleType,
      scheduledTime: task.scheduledTime,
      timezone: task.timezone,
      enableSearch: task.enableSearch,
      enabledToolSlugs: task.enabledToolSlugs,
      emailNotifications: task.emailNotifications,
    }),
    [
      task._id,
      task.title,
      task.prompt,
      task.scheduleType,
      task.scheduledTime,
      task.timezone,
      task.enableSearch,
      task.enabledToolSlugs,
      task.emailNotifications,
    ]
  );

  return (
    <>
      <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3
                className={`font-medium text-lg ${task.status === 'active' || task.status === 'running' ? '' : 'opacity-60'}`}
              >
                {task.title}
              </h3>
              <Badge
                className="border-outline-foreground text-xs"
                variant="secondary"
              >
                {scheduleDisplay}
              </Badge>
              {weeklyDay && (
                <Badge
                  className="border-outline-foreground text-xs"
                  variant="secondary"
                >
                  {weeklyDay}
                </Badge>
              )}
              {task.emailNotifications && (
                <Badge
                  className="border-outline-foreground text-xs"
                  variant="secondary"
                >
                  Email
                </Badge>
              )}
              {task.status === 'paused' && (
                <Badge className="text-xs" variant="outline">
                  <span className="mr-1">⏸️</span>
                  Paused
                </Badge>
              )}
              {task.status === 'running' && (
                <Badge className="text-xs" variant="outline">
                  <span className="mr-1">⚡</span>
                  Running
                </Badge>
              )}
              {task.status === 'archived' && (
                <Badge className="text-xs" variant="outline">
                  <span className="mr-1">📦</span>
                  Archived
                </Badge>
              )}
            </div>

            <div className="mt-4 space-y-1 text-muted-foreground text-sm">
              <p>Next Run: {nextExecutionDisplay}</p>
              <p>Last Run: {lastExecutionDisplay}</p>
            </div>
          </div>

          <div className="flex h-full flex-col justify-between">
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={
                      task.status === 'active' ? 'Pause task' : 'Resume task'
                    }
                    className="h-8 w-8"
                    disabled={
                      task.status === 'running' || task.status === 'archived'
                    }
                    onClick={handlePauseResume}
                    size="icon"
                    variant="ghost"
                  >
                    {task.status === 'active' ? (
                      <PauseIcon className="h-4 w-4" />
                    ) : (
                      <PlayIcon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltipContent}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Run task once now"
                    className="h-8 w-8"
                    onClick={handleTriggerNow}
                    size="icon"
                    variant="ghost"
                  >
                    <RepeatOnceIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Run task once now</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Edit task"
                    className="h-8 w-8"
                    onClick={() => setShowEditDialog(true)}
                    size="icon"
                    variant="ghost"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit task</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Archive task"
                    className="h-8 w-8"
                    onClick={handleArchive}
                    size="icon"
                    variant="ghost"
                  >
                    <ArchiveIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Archive task</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Delete task"
                    className="h-8 w-8"
                    onClick={() => setShowDeleteDialog(true)}
                    size="icon"
                    variant="ghost"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete task</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="mt-10 flex justify-end">
              {task.lastExecuted && task.chatId && (
                <Link
                  className="text-primary text-xs hover:underline"
                  href={`/c/${task.chatId}`}
                >
                  View Results
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete scheduled task?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              scheduled task &quot;{task.title}&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDialog
        initialData={taskDialogInitialData}
        isOpen={showEditDialog}
        mode="edit"
        onClose={handleEditSuccess}
      />
    </>
  );
}

// Memoize TaskCard component to prevent unnecessary re-renders
// Only re-render when task data actually changes
export const TaskCard = memo(TaskCardComponent, (prevProps, nextProps) => {
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;

  // Deep comparison of relevant task properties
  return (
    prevTask._id === nextTask._id &&
    prevTask.title === nextTask.title &&
    prevTask.status === nextTask.status &&
    prevTask.scheduleType === nextTask.scheduleType &&
    prevTask.scheduledTime === nextTask.scheduledTime &&
    prevTask.nextExecution === nextTask.nextExecution &&
    prevTask.lastExecuted === nextTask.lastExecuted &&
    prevTask.emailNotifications === nextTask.emailNotifications &&
    prevTask.chatId === nextTask.chatId &&
    prevTask.prompt === nextTask.prompt &&
    prevTask.timezone === nextTask.timezone &&
    prevTask.enableSearch === nextTask.enableSearch &&
    JSON.stringify(prevTask.enabledToolSlugs) ===
      JSON.stringify(nextTask.enabledToolSlugs)
  );
});

'use client';

import {
  Archive,
  Pause,
  Pencil,
  Play,
  PlayCircle,
  Trash,
} from '@phosphor-icons/react';
import { useMutation } from 'convex/react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { TaskDialog } from './task-dialog';
import type { ScheduledTask } from './types';

type TaskCardProps = {
  task: ScheduledTask;
};

export function TaskCard({ task }: TaskCardProps) {
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
      await updateTask({
        taskId: task._id,
        isActive: !task.isActive,
      });
      toast.success(task.isActive ? 'Task paused' : 'Task resumed');
    } catch (_error) {
      toast.error(`Failed to ${task.isActive ? 'pause' : 'resume'} task`);
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

  // Format schedule type display
  const getScheduleDisplay = () => {
    switch (task.scheduleType) {
      case 'onetime':
        return 'One-time';
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      default:
        return task.scheduleType;
    }
  };

  // Format time display
  const formatTime = (timestamp: number | undefined) => {
    if (!timestamp) {
      return 'Never';
    }
    return format(new Date(timestamp), 'MMM d, h:mm a');
  };

  return (
    <>
      <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3
                className={`font-medium text-lg ${task.isActive ? '' : 'opacity-60'}`}
              >
                {task.title}
              </h3>
              <Badge
                className="border-outline-foreground text-xs"
                variant="secondary"
              >
                {getScheduleDisplay()}
              </Badge>
              {task.isActive ? null : (
                <Badge className="text-xs" variant="outline">
                  <span className="mr-1">⏸️</span>
                  Paused
                </Badge>
              )}
            </div>

            <div className="mt-4 space-y-1 text-muted-foreground text-sm">
              <p>
                Next Run:{' '}
                {task.isActive ? formatTime(task.nextExecution) : 'Paused'}
              </p>
              <p>
                Last Run: {formatTime(task.lastExecuted)}
                {task.lastExecuted && task.chatId && (
                  <>
                    {' '}
                    <Link
                      className="ml-2 inline-flex items-center gap-1 text-primary text-xs hover:underline"
                      href={`/c/${task.chatId}`}
                    >
                      <span className="text-xs">📂</span>
                      View Results
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              aria-label={task.isActive ? 'Pause task' : 'Resume task'}
              className="h-8 w-8"
              onClick={handlePauseResume}
              size="icon"
              variant="ghost"
            >
              {task.isActive ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <Button
              aria-label="Run task once now"
              className="h-8 w-8"
              onClick={handleTriggerNow}
              size="icon"
              variant="ghost"
            >
              <PlayCircle className="h-4 w-4" />
            </Button>

            <Button
              aria-label="Edit task"
              className="h-8 w-8"
              onClick={() => setShowEditDialog(true)}
              size="icon"
              variant="ghost"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              aria-label="Archive task"
              className="h-8 w-8"
              onClick={() => {
                // TODO: Implement archive functionality
                toast.info('Archive functionality coming soon');
              }}
              size="icon"
              variant="ghost"
            >
              <Archive className="h-4 w-4" />
            </Button>

            <Button
              aria-label="Delete task"
              className="h-8 w-8"
              onClick={() => setShowDeleteDialog(true)}
              size="icon"
              variant="ghost"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scheduled task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              scheduled task &quot;{task.title}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskDialog
        initialData={{
          taskId: task._id,
          title: task.title,
          prompt: task.prompt,
          scheduleType: task.scheduleType,
          scheduledTime: task.scheduledTime,
          timezone: task.timezone,
          enableSearch: task.enableSearch,
          enabledToolSlugs: task.enabledToolSlugs,
        }}
        isOpen={showEditDialog}
        mode="edit"
        onClose={handleEditSuccess}
      />
    </>
  );
}

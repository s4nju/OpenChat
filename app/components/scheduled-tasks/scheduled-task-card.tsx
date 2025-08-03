'use client';

import { Copy, ShareFat, Trash } from '@phosphor-icons/react';
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
import { Card } from '@/components/ui/card';
import { api } from '@/convex/_generated/api';
import type { ScheduledTask } from './types';

type ScheduledTaskCardProps = {
  task: ScheduledTask;
};

export function ScheduledTaskCard({ task }: ScheduledTaskCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteTask = useMutation(api.scheduled_tasks.deleteScheduledTask);
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

  const handleCopy = () => {
    navigator.clipboard.writeText(task.prompt);
    toast.success('Task prompt copied to clipboard');
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    toast.info('Share functionality coming soon');
  };

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
    return format(new Date(timestamp), 'MMM d, yyyy, h:mm a');
  };

  return (
    <>
      <Card className="p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-lg">{task.title}</h3>
              <Badge variant="secondary">{getScheduleDisplay()}</Badge>
            </div>

            <div className="space-y-1 text-muted-foreground text-sm">
              <p>
                Next Run:{' '}
                <span className="text-foreground">
                  {formatTime(task.nextExecution)}
                </span>
              </p>
              <p>
                Last Run:{' '}
                <span className="text-foreground">
                  {formatTime(task.lastExecuted)}
                </span>
                {task.lastExecuted && task.chatId && (
                  <>
                    {' • '}
                    <Link
                      className="text-primary hover:underline"
                      href={`/c/${task.chatId}`}
                    >
                      View Results
                    </Link>
                  </>
                )}
              </p>
            </div>

            {/* Show truncated prompt */}
            <p className="line-clamp-2 text-muted-foreground text-sm">
              {task.prompt}
            </p>
          </div>

          <div className="ml-4 flex items-center gap-1">
            <Button
              aria-label="Run task now"
              onClick={handleTriggerNow}
              size="icon"
              variant="ghost"
            >
              <ShareFat className="h-4 w-4 rotate-90" />
            </Button>
            <Button
              aria-label="Copy task prompt"
              onClick={handleCopy}
              size="icon"
              variant="ghost"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Share task"
              onClick={handleShare}
              size="icon"
              variant="ghost"
            >
              <ShareFat className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Delete task"
              onClick={() => setShowDeleteDialog(true)}
              size="icon"
              variant="ghost"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

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
    </>
  );
}

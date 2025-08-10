'use client';

import { memo } from 'react';
import { useBreakpoint } from '@/app/hooks/use-breakpoint';
import type { Id } from '@/convex/_generated/dataModel';
import { TaskDialog } from './task-dialog';
import { TaskDrawer } from './task-drawer';
import type { CreateTaskForm } from './types';

type TaskTriggerProps = {
  trigger: React.ReactNode;
  initialData?: Partial<CreateTaskForm> & { taskId?: Id<'scheduled_tasks'> };
  mode?: 'create' | 'edit';
  disabled?: boolean;
};

function TaskTriggerComponent({
  trigger,
  initialData,
  mode = 'create',
  disabled = false,
}: TaskTriggerProps) {
  const isMobileOrTablet = useBreakpoint(896); // Same breakpoint as settings

  // If disabled, return the trigger without wrapping it in dialog/drawer
  if (disabled) {
    return <>{trigger}</>;
  }

  if (isMobileOrTablet) {
    return (
      <TaskDrawer initialData={initialData} mode={mode} trigger={trigger} />
    );
  }

  return <TaskDialog initialData={initialData} mode={mode} trigger={trigger} />;
}

// Memoize TaskTrigger component to prevent unnecessary re-renders
// Only re-render when trigger prop changes
export const TaskTrigger = memo(TaskTriggerComponent);

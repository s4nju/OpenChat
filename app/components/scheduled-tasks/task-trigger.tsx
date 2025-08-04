'use client';

import { memo } from 'react';
import { useBreakpoint } from '@/app/hooks/use-breakpoint';
import { TaskDialog } from './task-dialog';
import { TaskDrawer } from './task-drawer';

type TaskTriggerProps = {
  trigger: React.ReactNode;
};

function TaskTriggerComponent({ trigger }: TaskTriggerProps) {
  const isMobileOrTablet = useBreakpoint(896); // Same breakpoint as settings

  if (isMobileOrTablet) {
    return <TaskDrawer trigger={trigger} />;
  }

  return <TaskDialog trigger={trigger} />;
}

// Memoize TaskTrigger component to prevent unnecessary re-renders
// Only re-render when trigger prop changes
export const TaskTrigger = memo(TaskTriggerComponent);

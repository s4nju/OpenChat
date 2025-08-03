'use client';

import { useBreakpoint } from '@/app/hooks/use-breakpoint';
import { TaskDialog } from './task-dialog';
import { TaskDrawer } from './task-drawer';

type TaskTriggerProps = {
  trigger: React.ReactNode;
};

export function TaskTrigger({ trigger }: TaskTriggerProps) {
  const isMobileOrTablet = useBreakpoint(896); // Same breakpoint as settings

  if (isMobileOrTablet) {
    return <TaskDrawer trigger={trigger} />;
  }

  return <TaskDialog trigger={trigger} />;
}

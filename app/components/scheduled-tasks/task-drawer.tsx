'use client';

import { X } from '@phosphor-icons/react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import type { Id } from '@/convex/_generated/dataModel';
import { TaskFormContent } from './task-form';
import type { CreateTaskForm } from './types';

type TaskDrawerProps = {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  initialData?: Partial<CreateTaskForm> & { taskId?: Id<'scheduled_tasks'> };
  mode?: 'create' | 'edit';
};

export function TaskDrawer({
  trigger,
  isOpen,
  onClose,
  initialData,
  mode = 'create',
}: TaskDrawerProps) {
  // If using trigger mode (uncontrolled)
  if (trigger) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <div className="flex h-full max-h-[80vh] flex-col">
            <DrawerHeader className="flex-row items-center justify-between border-border border-b px-6 py-4">
              <DrawerTitle className="font-semibold text-base">
                {mode === 'edit'
                  ? 'Edit Scheduled Task'
                  : 'Create New Scheduled Task'}
              </DrawerTitle>
              <DrawerClose asChild>
                <button
                  aria-label="Close dialog"
                  className="flex size-11 items-center justify-center rounded-full hover:bg-muted focus:outline-none"
                  type="button"
                >
                  <X className="size-5" />
                </button>
              </DrawerClose>
            </DrawerHeader>

            <TaskFormContent
              CloseWrapper={({ children }) => (
                <DrawerClose asChild>{children}</DrawerClose>
              )}
              initialData={initialData}
              mode={mode}
              onCancel={() => {
                /* handled by DrawerClose wrapper */
              }}
              onSuccess={() => {
                /* handled by DrawerClose wrapper */
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Controlled mode (existing behavior)
  return (
    <Drawer onOpenChange={(open) => !open && onClose?.()} open={isOpen}>
      <DrawerContent className="max-h-[90vh]">
        <div className="flex h-full max-h-[80vh] flex-col">
          <DrawerHeader className="flex-row items-center justify-between border-border border-b px-6 py-4">
            <DrawerTitle className="font-semibold text-base">
              {mode === 'edit'
                ? 'Edit Scheduled Task'
                : 'Create New Scheduled Task'}
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                aria-label="Close dialog"
                className="flex size-11 items-center justify-center rounded-full hover:bg-muted focus:outline-none"
                type="button"
              >
                <X className="size-5" />
              </button>
            </DrawerClose>
          </DrawerHeader>

          <TaskFormContent
            CloseWrapper={({ children }) => (
              <DrawerClose asChild>{children}</DrawerClose>
            )}
            initialData={initialData}
            mode={mode}
            onCancel={
              onClose ||
              (() => {
                // No-op fallback
              })
            }
            onSuccess={
              onClose ||
              (() => {
                // No-op fallback
              })
            }
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

'use client';

import { X } from '@phosphor-icons/react';
import { lazy, Suspense, useRef } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import type { Id } from '@/convex/_generated/dataModel';
import type { CreateTaskForm } from './types';

// Lazy load TaskFormContent for better performance
const TaskFormContent = lazy(() =>
  import('./task-form').then((module) => ({ default: module.TaskFormContent }))
);

// Loading component for Suspense
const FormLoadingSpinner = () => (
  <div className="flex h-32 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
  </div>
);

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
  const closeRef = useRef<HTMLButtonElement>(null);

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

            <Suspense fallback={<FormLoadingSpinner />}>
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
                  // Programmatically trigger the close button
                  closeRef.current?.click();
                }}
              />
            </Suspense>
            {/* Hidden close button for programmatic closing */}
            <DrawerClose asChild>
              <button
                ref={closeRef}
                style={{ display: 'none' }}
                type="button"
              />
            </DrawerClose>
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

          <Suspense fallback={<FormLoadingSpinner />}>
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
              onSuccess={() => {
                onClose?.();
              }}
            />
          </Suspense>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

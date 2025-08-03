'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Id } from '@/convex/_generated/dataModel';
import { TaskFormContent } from './task-form';
import type { CreateTaskForm } from './types';

type TaskDialogProps = {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  initialData?: Partial<CreateTaskForm> & { taskId?: Id<'scheduled_tasks'> };
  mode?: 'create' | 'edit';
};

export function TaskDialog({
  trigger,
  isOpen,
  onClose,
  initialData,
  mode = 'create',
}: TaskDialogProps) {
  // If using trigger mode (uncontrolled)
  if (trigger) {
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          className="max-h-[90vh] max-w-2xl bg-background"
          hasCloseButton={false}
        >
          {' '}
          <div className="flex h-full max-h-[80vh] flex-col">
            <DialogHeader className="flex-row items-center justify-between border-border border-b px-6 py-4">
              <DialogTitle className="font-semibold text-base">
                {mode === 'edit'
                  ? 'Edit Scheduled Task'
                  : 'Create New Scheduled Task'}
              </DialogTitle>
            </DialogHeader>

            <TaskFormContent
              CloseWrapper={({ children }) => (
                <DialogClose asChild>{children}</DialogClose>
              )}
              initialData={initialData}
              mode={mode}
              onCancel={() => {
                /* handled by DialogClose wrapper */
              }}
              onSuccess={() => {
                /* handled by DialogClose wrapper */
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Controlled mode (existing behavior)
  return (
    <Dialog onOpenChange={(open) => !open && onClose?.()} open={isOpen}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl bg-background"
        hasCloseButton={false}
      >
        {' '}
        <div className="flex h-full max-h-[80vh] flex-col">
          <DialogHeader className="flex-row items-center justify-between border-border border-b px-6 py-4">
            <DialogTitle className="font-semibold text-base">
              {mode === 'edit'
                ? 'Edit Scheduled Task'
                : 'Create New Scheduled Task'}
            </DialogTitle>
          </DialogHeader>

          <TaskFormContent
            CloseWrapper={({ children }) => (
              <DialogClose asChild>{children}</DialogClose>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

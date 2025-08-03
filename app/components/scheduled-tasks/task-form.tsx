'use client';

import { convexQuery } from '@convex-dev/react-query';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { useMutation } from 'convex/react';
import { format } from 'date-fns';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  getNextAvailableDate,
  getNextAvailableTime,
} from '@/app/utils/time-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { TimePicker } from './time-picker';
import type { CreateTaskForm } from './types';

// Task limits constants (matching backend)
const TASK_LIMITS = {
  DAILY_TASKS: 5,
  WEEKLY_TASKS: 10,
  TOTAL_TASKS: 10,
} as const;

type CreateTaskFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
  CloseWrapper?: React.ComponentType<{ children: React.ReactNode }>;
  initialData?: Partial<CreateTaskForm> & { taskId?: Id<'scheduled_tasks'> };
  mode?: 'create' | 'edit';
};

export function TaskFormContent({
  onSuccess,
  onCancel,
  CloseWrapper,
  initialData,
  mode = 'create',
}: CreateTaskFormProps) {
  const [form, setForm] = useState<CreateTaskForm>({
    title: initialData?.title || '',
    prompt: initialData?.prompt || '',
    scheduleType: initialData?.scheduleType || 'daily',
    scheduledTime: initialData?.scheduledTime || '09:00',
    scheduledDate: initialData?.scheduledDate,
    timezone:
      initialData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    enableSearch: initialData?.enableSearch,
    enabledToolSlugs: initialData?.enabledToolSlugs || [],
    emailNotifications: initialData?.emailNotifications,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTask = useMutation(api.scheduled_tasks.createScheduledTask);
  const updateTask = useMutation(api.scheduled_tasks.updateScheduledTask);

  // Fetch task limits data
  const { data: taskLimits } = useTanStackQuery({
    ...convexQuery(api.scheduled_tasks.getTaskLimits, {}),
    gcTime: 30 * 1000, // 30 seconds
  });

  // Reset form when component mounts or initialData changes
  useEffect(() => {
    setForm({
      title: initialData?.title || '',
      prompt: initialData?.prompt || '',
      scheduleType: initialData?.scheduleType || 'daily',
      scheduledTime: initialData?.scheduledTime || '09:00',
      scheduledDate: initialData?.scheduledDate,
      timezone:
        initialData?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      enableSearch: initialData?.enableSearch,
      enabledToolSlugs: initialData?.enabledToolSlugs || [],
      emailNotifications: initialData?.emailNotifications,
    });
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(form.title.trim() && form.prompt.trim())) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'edit' && initialData?.taskId) {
        await updateTask({
          taskId: initialData.taskId,
          title: form.title.trim(),
          prompt: form.prompt.trim(),
          scheduledTime: form.scheduledTime,
          scheduledDate: form.scheduledDate,
          timezone: form.timezone,
          enableSearch: form.enableSearch,
          enabledToolSlugs: form.enabledToolSlugs,
        });
        toast.success('Scheduled task updated successfully');
      } else {
        await createTask({
          title: form.title.trim(),
          prompt: form.prompt.trim(),
          scheduleType: form.scheduleType as 'onetime' | 'daily' | 'weekly',
          scheduledTime: form.scheduledTime,
          scheduledDate: form.scheduledDate,
          timezone: form.timezone,
          enableSearch: form.enableSearch,
          enabledToolSlugs: form.enabledToolSlugs,
        });
        toast.success('Scheduled task created successfully');
      }
      onSuccess();
    } catch (_error) {
      // Error logged for debugging purposes
      toast.error(
        `Failed to ${mode === 'edit' ? 'update' : 'create'} task. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateForm = <K extends keyof CreateTaskForm>(
    field: K,
    value: CreateTaskForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Set default time and date for onetime tasks when schedule type changes
  useEffect(() => {
    if (form.scheduleType === 'onetime' && mode === 'create') {
      // Only set defaults if values are not already set
      const needsTimeDefault =
        !initialData?.scheduledTime && form.scheduledTime === '09:00';
      const needsDateDefault = !(
        initialData?.scheduledDate || form.scheduledDate
      );

      if (needsTimeDefault || needsDateDefault) {
        const nextTime = getNextAvailableTime();
        const nextDate = getNextAvailableDate();

        setForm((prev) => ({
          ...prev,
          ...(needsTimeDefault && { scheduledTime: nextTime }),
          ...(needsDateDefault && {
            scheduledDate: format(nextDate, 'yyyy-MM-dd'),
          }),
        }));
      }
    }
  }, [
    form.scheduleType,
    mode,
    initialData?.scheduledTime,
    initialData?.scheduledDate,
    form.scheduledTime,
    form.scheduledDate,
  ]);

  // Helper to convert form.scheduledDate string to Date object
  const getSelectedDate = () => {
    if (!form.scheduledDate) {
      return;
    }
    return new Date(form.scheduledDate);
  };

  // Helper to handle date changes
  const handleDateChange = (date: Date | undefined) => {
    updateForm('scheduledDate', date ? format(date, 'yyyy-MM-dd') : undefined);
  };

  // Check if user has reached limits for current schedule type
  const isLimitReached = () => {
    if (!taskLimits) {
      return false;
    }

    switch (form.scheduleType) {
      case 'daily':
        // Daily tasks are limited by both daily limit AND total limit
        return (
          taskLimits.daily.remaining <= 0 || taskLimits.total.remaining <= 0
        );
      case 'weekly':
        // Weekly tasks are limited by both weekly limit AND total limit
        return (
          taskLimits.weekly.remaining <= 0 || taskLimits.total.remaining <= 0
        );
      default:
        return taskLimits.total.remaining <= 0;
    }
  };

  // Helper function to get color for progress ring
  const getDailyTaskColor = (
    remaining: number
  ): 'danger' | 'warning' | 'success' => {
    if (remaining <= 0) {
      return 'danger';
    }
    if (remaining <= 1) {
      return 'warning';
    }
    return 'success';
  };

  const getTotalTaskColor = (
    remaining: number
  ): 'danger' | 'warning' | 'primary' => {
    if (remaining <= 0) {
      return 'danger';
    }
    if (remaining <= 2) {
      return 'warning';
    }
    return 'primary';
  };

  return (
    <form
      className="flex flex-1 flex-col overflow-hidden"
      onSubmit={handleSubmit}
    >
      <div className="flex-1 space-y-5 overflow-auto p-6">
        {/* Task Name */}
        <div className="space-y-2">
          <Label htmlFor="title">Task Name</Label>
          <Input
            id="title"
            onChange={(e) => updateForm('title', e.target.value)}
            placeholder="Enter task name"
            required
            value={form.title}
          />
        </div>

        {/* Frequency */}
        <div className="space-y-3">
          <Label>Frequency</Label>
          <div className="inline-flex rounded-md bg-muted p-1">
            {(['onetime', 'daily', 'weekly'] as const).map((type) => (
              <Button
                className={`${
                  form.scheduleType === type
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-transparent text-muted-foreground hover:bg-muted'
                } rounded-md px-4`}
                key={type}
                onClick={() => updateForm('scheduleType', type)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {type === 'onetime'
                  ? 'Once'
                  : type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="space-y-2">
          <Label htmlFor="scheduledTime">On</Label>
          <TimePicker
            filterPastTimes={form.scheduleType === 'onetime'}
            name="scheduledTime"
            onChange={(value) => updateForm('scheduledTime', value)}
            onDateChange={handleDateChange}
            selectedDate={getSelectedDate()}
            showDatePicker={form.scheduleType === 'onetime'}
            value={form.scheduledTime}
          />
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Tasks will run based on this timezone</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input id="timezone" readOnly value={form.timezone} />
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Instructions</Label>
          <Textarea
            className="min-h-[120px] resize-none"
            id="prompt"
            onChange={(e) => updateForm('prompt', e.target.value)}
            placeholder="Enter detailed instructions for what you want the task to search for and analyze..."
            required
            value={form.prompt}
          />
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={form.enableSearch}
              id="enableSearch"
              onCheckedChange={(checked) =>
                updateForm('enableSearch', !!checked)
              }
            />
            <Label htmlFor="enableSearch">Enable web search</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={form.emailNotifications}
              id="emailNotifications"
              onCheckedChange={(checked) =>
                updateForm('emailNotifications', !!checked)
              }
            />
            <Label htmlFor="emailNotifications">
              Email notifications enabled
            </Label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-border border-t p-6">
        <div className="flex items-center justify-between">
          {/* Task Limits Display with Progress Ring */}
          <div className="flex items-center gap-3">
            {taskLimits && (
              <>
                {form.scheduleType === 'daily' ? (
                  <ProgressRing
                    color={getDailyTaskColor(taskLimits.daily.remaining)}
                    max={TASK_LIMITS.DAILY_TASKS}
                    showLabel={false}
                    size={24}
                    strokeWidth={2}
                    value={TASK_LIMITS.DAILY_TASKS - taskLimits.daily.remaining}
                  />
                ) : (
                  <ProgressRing
                    color={getTotalTaskColor(taskLimits.total.remaining)}
                    max={TASK_LIMITS.TOTAL_TASKS}
                    showLabel={false}
                    size={24}
                    strokeWidth={2}
                    value={TASK_LIMITS.TOTAL_TASKS - taskLimits.total.remaining}
                  />
                )}
                <div className="text-muted-foreground text-xs">
                  {form.scheduleType === 'daily'
                    ? `${Math.max(0, taskLimits.daily.remaining)} task remaining`
                    : `${taskLimits.total.remaining} task remaining`}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            {CloseWrapper ? (
              <CloseWrapper>
                <Button onClick={onCancel} type="button" variant="outline">
                  Cancel
                </Button>
              </CloseWrapper>
            ) : (
              <Button onClick={onCancel} type="button" variant="outline">
                Cancel
              </Button>
            )}
            <Button
              disabled={isSubmitting || (mode === 'create' && isLimitReached())}
              type="submit"
            >
              {(() => {
                if (isSubmitting) {
                  return mode === 'edit' ? 'Updating...' : 'Creating...';
                }
                if (mode === 'create' && isLimitReached()) {
                  return 'Limit Reached';
                }
                return mode === 'edit' ? 'Update' : 'Create';
              })()}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

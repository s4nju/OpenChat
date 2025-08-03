'use client';

import { Info, X } from '@phosphor-icons/react';
import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { api } from '@/convex/_generated/api';
import type { CreateTaskForm } from './types';

type CreateTaskDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateTaskDrawer({ isOpen, onClose }: CreateTaskDrawerProps) {
  const [form, setForm] = useState<CreateTaskForm>({
    title: '',
    prompt: '',
    scheduleType: 'daily',
    scheduledTime: '09:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    enableSearch: false,
    enabledToolSlugs: [],
    emailNotifications: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTask = useMutation(api.scheduled_tasks.createScheduledTask);

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        title: '',
        prompt: '',
        scheduleType: 'daily',
        scheduledTime: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        enableSearch: false,
        enabledToolSlugs: [],
        emailNotifications: false,
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(form.title.trim() && form.prompt.trim())) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTask({
        title: form.title.trim(),
        prompt: form.prompt.trim(),
        scheduleType: form.scheduleType as 'onetime' | 'daily' | 'weekly',
        scheduledTime: form.scheduledTime,
        timezone: form.timezone,
        enableSearch: form.enableSearch,
        enabledToolSlugs: form.enabledToolSlugs,
      });

      toast.success('Scheduled task created successfully');
      onClose();
    } catch (_error) {
      // Error logged for debugging purposes
      toast.error('Failed to create task. Please try again.');
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

  // Get task limits display (simplified for now)
  const getTaskLimitsDisplay = () => {
    switch (form.scheduleType) {
      case 'daily':
        return '5 daily remaining';
      case 'weekly':
        return '10 weekly remaining';
      default:
        return '10 total remaining';
    }
  };

  return (
    <Drawer onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DrawerContent className="max-h-[90vh]">
        <div className="flex h-full max-h-[80vh] flex-col">
          <DrawerHeader className="flex-row items-center justify-between border-border border-b px-6 py-4">
            <DrawerTitle className="font-semibold text-base">
              Create New Scheduled Task
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

          <form
            className="flex flex-1 flex-col overflow-hidden"
            onSubmit={handleSubmit}
          >
            <div className="flex-1 space-y-6 overflow-auto p-6">
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
                <div className="flex gap-2">
                  {(['onetime', 'daily', 'weekly'] as const).map((type) => (
                    <Button
                      className={`${
                        form.scheduleType === type
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      key={type}
                      onClick={() => updateForm('scheduleType', type)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {type === 'onetime'
                        ? 'Once'
                        : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time">On</Label>
                  <Select
                    onValueChange={(value) =>
                      updateForm('scheduledTime', value)
                    }
                    value={form.scheduledTime}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>AM/PM</Label>
                  <Select
                    onValueChange={(value) => {
                      const [hours] = form.scheduledTime.split(':');
                      const hour24 =
                        value === 'AM'
                          ? (Number.parseInt(hours, 10) % 12)
                              .toString()
                              .padStart(2, '0')
                          : ((Number.parseInt(hours, 10) % 12) + 12)
                              .toString()
                              .padStart(2, '0');
                      updateForm('scheduledTime', `${hour24}:00`);
                    }}
                    value={
                      Number.parseInt(form.scheduledTime.split(':')[0], 10) >=
                      12
                        ? 'PM'
                        : 'AM'
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

              {/* Task Limits Display */}
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                {getTaskLimitsDisplay()}
              </div>
            </div>

            {/* Footer */}
            <div className="border-border border-t p-6">
              <div className="flex justify-end gap-3">
                <Button onClick={onClose} type="button" variant="outline">
                  Cancel
                </Button>
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

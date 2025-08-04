'use client';

import { convexQuery } from '@convex-dev/react-query';
import { Plus } from '@phosphor-icons/react';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/convex/_generated/api';
import { TaskCard } from './task-card';
import { TaskTrigger } from './task-trigger';
import type { TaskStatus } from './types';

// Static constants moved outside component for better performance
const SCROLL_CONTAINER_STYLES = {
  maxHeight: '440px',
  overflowY: 'scroll' as const,
  scrollbarGutter: 'stable' as const,
};

const SKELETON_ARRAY = Array.from({ length: 1 });

export function ScheduledTasksPage() {
  const [activeTab, setActiveTab] = useState<TaskStatus>('active');

  // Memoized query configuration to prevent recreation on every render
  const queryConfig = useMemo(
    () => ({
      ...convexQuery(api.scheduled_tasks.listScheduledTasks, {}),
      gcTime: 10 * 60 * 1000, // 10 minutes
    }),
    []
  );

  const { data: tasks = [], isLoading } = useTanStackQuery(queryConfig);

  // Memoized task filtering to prevent recalculation on every render
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (activeTab === 'active') {
        return (
          task.status === 'active' ||
          task.status === 'paused' ||
          task.status === 'running'
        );
      }
      return task.status === 'archived';
    });
  }, [tasks, activeTab]);

  // Memoized tab change handler to prevent recreation on every render
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as TaskStatus);
  }, []);

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Single line header */}
        <div className="mb-12 grid grid-cols-3 items-center pr-4">
          {/* Tabs on the left */}
          <div className="justify-self-start">
            <Tabs
              defaultValue="active"
              onValueChange={handleTabChange}
              value={activeTab}
            >
              <TabsList className="grid w-[180px] grid-cols-2">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Centered Title */}
          <h1 className="justify-self-center font-semibold text-4xl">Tasks</h1>

          {/* Add button on the right */}
          <div className="justify-self-end">
            <TaskTrigger
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add new
                </Button>
              }
            />
          </div>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="space-y-3">
            {SKELETON_ARRAY.map((_, i) => (
              <div
                className="h-28 animate-pulse rounded-xl bg-muted/50"
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items
                key={i}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredTasks.length === 0 && (
          <div className="mr-4 flex min-h-[138px] items-center justify-center rounded-xl border border-border bg-card/50">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">
                {activeTab === 'active'
                  ? 'No scheduled tasks yet'
                  : 'No archived tasks'}
              </p>
              {activeTab === 'active' && (
                <TaskTrigger
                  trigger={
                    <Button size="sm" variant="outline">
                      Create your first task
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        )}

        {!isLoading && filteredTasks.length > 0 && (
          <div className="space-y-3 pr-4" style={SCROLL_CONTAINER_STYLES}>
            {filteredTasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

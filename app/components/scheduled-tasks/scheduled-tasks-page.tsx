'use client';

import { convexQuery } from '@convex-dev/react-query';
import { Plus } from '@phosphor-icons/react';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/convex/_generated/api';
import { TaskCard } from './task-card';
import { TaskTrigger } from './task-trigger';
import type { TaskStatus } from './types';

export function ScheduledTasksPage() {
  const [activeTab, setActiveTab] = useState<TaskStatus>('active');

  const { data: tasks = [], isLoading } = useTanStackQuery({
    ...convexQuery(api.scheduled_tasks.listScheduledTasks, {}),
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter tasks based on active/archived status
  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'active') {
      return task.isActive;
    }
    return !task.isActive;
  });

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Single line header */}
        <div className="mb-12 grid grid-cols-3 items-center">
          {/* Tabs on the left */}
          <div className="justify-self-start">
            <Tabs
              defaultValue="active"
              onValueChange={(value) => setActiveTab(value as TaskStatus)}
              value={activeTab}
            >
              <TabsList className="grid w-[180px] grid-cols-2">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Centered Title */}
          <h1 className="justify-self-center font-semibold text-3xl">Tasks</h1>

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
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                className="h-28 animate-pulse rounded-xl bg-muted/50"
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items
                key={i}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredTasks.length === 0 && (
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-border bg-card/50 p-8">
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
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

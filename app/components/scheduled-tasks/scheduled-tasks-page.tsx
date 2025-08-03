'use client';

import { convexQuery } from '@convex-dev/react-query';
import { ArrowsClockwise, Plus } from '@phosphor-icons/react';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/convex/_generated/api';
import { CreateTaskDrawer } from './create-task-drawer';
import { ScheduledTaskCard } from './scheduled-task-card';
import type { TaskStatus } from './types';

export function ScheduledTasksPage() {
  const [activeTab, setActiveTab] = useState<TaskStatus>('active');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const {
    data: tasks = [],
    isLoading,
    refetch,
  } = useTanStackQuery({
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

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 border-border border-b p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-2xl">Scheduled Tasks</h1>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Refresh tasks"
              onClick={handleRefresh}
              size="icon"
              variant="ghost"
            >
              <ArrowsClockwise className="h-4 w-4" />
            </Button>
            <Button
              className="gap-2"
              onClick={() => setIsCreateDrawerOpen(true)}
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add new
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          defaultValue="active"
          onValueChange={(value) => setActiveTab(value as TaskStatus)}
          value={activeTab}
        >
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                className="h-32 animate-pulse rounded-lg bg-muted/50"
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items
                key={i}
              />
            ))}
          </div>
        )}
        {!isLoading && filteredTasks.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">
                {activeTab === 'active'
                  ? 'No active scheduled tasks'
                  : 'No archived tasks'}
              </p>
              {activeTab === 'active' && (
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateDrawerOpen(true)}
                  variant="outline"
                >
                  Create your first task
                </Button>
              )}
            </div>
          </div>
        )}
        {!isLoading && filteredTasks.length > 0 && (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <ScheduledTaskCard key={task._id} task={task} />
            ))}
          </div>
        )}
      </div>

      {/* Create Task Drawer */}
      <CreateTaskDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
      />
    </div>
  );
}

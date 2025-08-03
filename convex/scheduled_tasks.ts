import { ConvexError, v } from 'convex/values';
import { fromZonedTime } from 'date-fns-tz';
import { ERROR_CODES } from '../lib/error-codes';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { ensureAuthenticated } from './lib/auth_helper';

// Constants for task limits
const TASK_LIMITS = {
  daily: 5,
  weekly: 10,
  total: 10,
} as const;

// Helper function to parse scheduled time and convert to next execution timestamp
function calculateNextExecution(
  scheduleType: 'onetime' | 'daily' | 'weekly',
  scheduledTime: string,
  timezone: string,
  scheduledDate?: string
): number {
  const now = Date.now();

  if (scheduleType === 'onetime') {
    // For one-time tasks, scheduledTime is "HH:MM" format
    const [hours, minutes] = scheduledTime.split(':').map(Number);

    let userDate: Date;

    if (scheduledDate) {
      // Use the provided date in "YYYY-MM-DD" format
      const [year, month, day] = scheduledDate.split('-').map(Number);
      userDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    } else {
      // Fallback to tomorrow if no date provided (backward compatibility)
      const nowInUserTz = new Date();
      userDate = new Date(
        nowInUserTz.getFullYear(),
        nowInUserTz.getMonth(),
        nowInUserTz.getDate() + 1, // Tomorrow
        hours,
        minutes,
        0,
        0
      );
    }

    // Convert from user timezone to UTC
    const utcDate = fromZonedTime(userDate, timezone);

    if (!utcDate || Number.isNaN(utcDate.getTime())) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    return utcDate.getTime();
  }

  // For recurring tasks, always calculate from the scheduled time
  // This ensures consistent timing regardless of execution delays

  if (scheduleType === 'daily') {
    // scheduledTime format: "HH:MM"
    const [hours, minutes] = scheduledTime.split(':').map(Number);

    // Create a date in the user's timezone
    const nowInUserTz = new Date();
    const userDate = new Date(
      nowInUserTz.getFullYear(),
      nowInUserTz.getMonth(),
      nowInUserTz.getDate(),
      hours,
      minutes,
      0,
      0
    );

    // Convert from user timezone to UTC
    let utcDate = fromZonedTime(userDate, timezone);

    if (!utcDate || Number.isNaN(utcDate.getTime())) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    // Keep adding days until we find the next future occurrence
    while (utcDate.getTime() <= now) {
      userDate.setDate(userDate.getDate() + 1);
      utcDate = fromZonedTime(userDate, timezone);

      if (!utcDate || Number.isNaN(utcDate.getTime())) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }
    }

    return utcDate.getTime();
  }

  if (scheduleType === 'weekly') {
    // scheduledTime format: "day:HH:MM" where day is 0-6 (Sunday-Saturday)
    const [dayStr, timeStr] = scheduledTime.split(':');
    const targetDay = Number.parseInt(dayStr, 10);
    const [hours, minutes] = timeStr.split(':').map(Number);

    // Create a date in the user's timezone
    const nowInUserTz = new Date();
    const currentDay = nowInUserTz.getDay();
    const daysToTarget = (targetDay - currentDay + 7) % 7;

    const userDate = new Date(
      nowInUserTz.getFullYear(),
      nowInUserTz.getMonth(),
      nowInUserTz.getDate() + daysToTarget,
      hours,
      minutes,
      0,
      0
    );

    // Convert from user timezone to UTC
    let utcDate = fromZonedTime(userDate, timezone);

    if (!utcDate || Number.isNaN(utcDate.getTime())) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    // If this week's occurrence is in the past, add 7 days
    if (utcDate.getTime() <= now) {
      userDate.setDate(userDate.getDate() + 7);
      utcDate = fromZonedTime(userDate, timezone);

      if (!utcDate || Number.isNaN(utcDate.getTime())) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }
    }

    return utcDate.getTime();
  }

  throw new Error('Invalid schedule type');
}

// Create a new scheduled task
export const createScheduledTask = mutation({
  args: {
    title: v.string(),
    prompt: v.string(),
    scheduleType: v.union(
      v.literal('onetime'),
      v.literal('daily'),
      v.literal('weekly')
    ),
    scheduledTime: v.string(),
    scheduledDate: v.optional(v.string()), // For onetime tasks, format: "YYYY-MM-DD"
    timezone: v.string(),
    enableSearch: v.optional(v.boolean()),
    enabledToolSlugs: v.optional(v.array(v.string())),
    chatId: v.optional(v.id('chats')),
  },
  returns: v.id('scheduled_tasks'),
  handler: async (ctx, args) => {
    const userId = await ensureAuthenticated(ctx);

    // Validate user limits
    const activeTasks = await ctx.db
      .query('scheduled_tasks')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();

    const counts = {
      daily: activeTasks.filter((t) => t.scheduleType === 'daily').length,
      weekly: activeTasks.filter((t) => t.scheduleType === 'weekly').length,
      total: activeTasks.length,
    };

    // Check limits
    if (args.scheduleType === 'daily' && counts.daily >= TASK_LIMITS.daily) {
      throw new ConvexError('Daily task limit reached (max 5)');
    }
    if (args.scheduleType === 'weekly' && counts.weekly >= TASK_LIMITS.weekly) {
      throw new ConvexError('Weekly task limit reached (max 10)');
    }
    if (counts.total >= TASK_LIMITS.total) {
      throw new ConvexError('Total task limit reached (max 10)');
    }

    const now = Date.now();
    const nextExecution = calculateNextExecution(
      args.scheduleType,
      args.scheduledTime,
      args.timezone,
      args.scheduledDate
    );

    // Insert the task
    const taskId = await ctx.db.insert('scheduled_tasks', {
      userId,
      title: args.title,
      prompt: args.prompt,
      scheduleType: args.scheduleType,
      scheduledTime: args.scheduledTime,
      scheduledDate: args.scheduledDate,
      timezone: args.timezone,
      isActive: true,
      enableSearch: args.enableSearch,
      enabledToolSlugs: args.enabledToolSlugs,
      chatId: args.chatId,
      createdAt: now,
      nextExecution,
    });

    // Schedule the function
    const scheduledFunctionId = await ctx.scheduler.runAt(
      nextExecution,
      internal.scheduled_ai.executeTask,
      { taskId }
    );

    // Update task with scheduled function ID
    await ctx.db.patch(taskId, { scheduledFunctionId });

    return taskId;
  },
});

// List user's scheduled tasks
export const listScheduledTasks = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('scheduled_tasks'),
      _creationTime: v.number(),
      userId: v.id('users'),
      title: v.string(),
      prompt: v.string(),
      scheduleType: v.union(
        v.literal('onetime'),
        v.literal('daily'),
        v.literal('weekly')
      ),
      scheduledTime: v.string(),
      scheduledDate: v.optional(v.string()),
      timezone: v.string(),
      isActive: v.boolean(),
      enableSearch: v.optional(v.boolean()),
      enabledToolSlugs: v.optional(v.array(v.string())),
      lastExecuted: v.optional(v.number()),
      nextExecution: v.optional(v.number()),
      scheduledFunctionId: v.optional(v.string()),
      createdAt: v.number(),
      chatId: v.optional(v.id('chats')),
    })
  ),
  handler: async (ctx) => {
    const userId = await ensureAuthenticated(ctx);

    return await ctx.db
      .query('scheduled_tasks')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();
  },
});

// Update a scheduled task
export const updateScheduledTask = mutation({
  args: {
    taskId: v.id('scheduled_tasks'),
    title: v.optional(v.string()),
    prompt: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    timezone: v.optional(v.string()),
    enableSearch: v.optional(v.boolean()),
    enabledToolSlugs: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await ensureAuthenticated(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new ConvexError({
        message: 'Scheduled task not found',
        code: ERROR_CODES.INVALID_INPUT,
      });
    }

    // Prepare update object
    const updates: Partial<Doc<'scheduled_tasks'>> = {};
    if (args.title !== undefined) {
      updates.title = args.title;
    }
    if (args.prompt !== undefined) {
      updates.prompt = args.prompt;
    }
    if (args.timezone !== undefined) {
      updates.timezone = args.timezone;
    }
    if (args.enableSearch !== undefined) {
      updates.enableSearch = args.enableSearch;
    }
    if (args.enabledToolSlugs !== undefined) {
      updates.enabledToolSlugs = args.enabledToolSlugs;
    }
    if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
    }
    if (args.scheduledDate !== undefined) {
      updates.scheduledDate = args.scheduledDate;
    }

    // If scheduledTime, scheduledDate, or timezone changed, recalculate next execution
    if (
      args.scheduledTime !== undefined ||
      args.scheduledDate !== undefined ||
      args.timezone !== undefined
    ) {
      const newScheduledTime = args.scheduledTime ?? task.scheduledTime;
      const newScheduledDate = args.scheduledDate ?? task.scheduledDate;
      // const newTimezone = args.timezone ?? task.timezone;

      // Cancel existing scheduled function if any
      if (task.scheduledFunctionId) {
        await ctx.scheduler.cancel(
          task.scheduledFunctionId as Id<'_scheduled_functions'>
        );
      }

      // Only reschedule if task is active
      if (args.isActive !== false && task.isActive !== false) {
        const nextExecution = calculateNextExecution(
          task.scheduleType,
          newScheduledTime,
          args.timezone ?? task.timezone,
          newScheduledDate
        );

        const scheduledFunctionId = await ctx.scheduler.runAt(
          nextExecution,
          internal.scheduled_ai.executeTask,
          { taskId: args.taskId }
        );

        updates.scheduledTime = newScheduledTime;
        updates.nextExecution = nextExecution;
        updates.scheduledFunctionId = scheduledFunctionId;
      } else {
        updates.scheduledTime = newScheduledTime;
        updates.scheduledFunctionId = undefined;
        updates.nextExecution = undefined;
      }
    }

    // If only activating/deactivating
    if (
      args.isActive !== undefined &&
      args.scheduledTime === undefined &&
      args.scheduledDate === undefined &&
      args.timezone === undefined
    ) {
      if (args.isActive && !task.isActive) {
        // Reactivating - schedule next execution
        const nextExecution = calculateNextExecution(
          task.scheduleType,
          task.scheduledTime,
          task.timezone,
          task.scheduledDate
        );

        const scheduledFunctionId = await ctx.scheduler.runAt(
          nextExecution,
          internal.scheduled_ai.executeTask,
          { taskId: args.taskId }
        );

        updates.nextExecution = nextExecution;
        updates.scheduledFunctionId = scheduledFunctionId;
      } else if (!args.isActive && task.isActive) {
        // Deactivating - cancel scheduled function
        if (task.scheduledFunctionId) {
          await ctx.scheduler.cancel(
            task.scheduledFunctionId as Id<'_scheduled_functions'>
          );
        }
        updates.scheduledFunctionId = undefined;
        updates.nextExecution = undefined;
      }
    }

    await ctx.db.patch(args.taskId, updates);
    return null;
  },
});

// Delete a scheduled task
export const deleteScheduledTask = mutation({
  args: { taskId: v.id('scheduled_tasks') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await ensureAuthenticated(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new ConvexError({
        message: 'Scheduled task not found',
        code: ERROR_CODES.INVALID_INPUT,
      });
    }

    // Cancel scheduled function if any
    if (task.scheduledFunctionId) {
      await ctx.scheduler.cancel(
        task.scheduledFunctionId as Id<'_scheduled_functions'>
      );
    }

    await ctx.db.delete(args.taskId);
    return null;
  },
});

// Internal query to get task details
export const getTask = internalQuery({
  args: { taskId: v.id('scheduled_tasks') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('scheduled_tasks'),
      _creationTime: v.number(),
      userId: v.id('users'),
      title: v.string(),
      prompt: v.string(),
      scheduleType: v.union(
        v.literal('onetime'),
        v.literal('daily'),
        v.literal('weekly')
      ),
      scheduledTime: v.string(),
      scheduledDate: v.optional(v.string()),
      timezone: v.string(),
      isActive: v.boolean(),
      enableSearch: v.optional(v.boolean()),
      enabledToolSlugs: v.optional(v.array(v.string())),
      lastExecuted: v.optional(v.number()),
      nextExecution: v.optional(v.number()),
      scheduledFunctionId: v.optional(v.string()),
      createdAt: v.number(),
      chatId: v.optional(v.id('chats')),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

// Internal mutation to update task after execution
export const updateTaskAfterExecution = internalMutation({
  args: {
    taskId: v.id('scheduled_tasks'),
    lastExecuted: v.number(),
    nextExecution: v.optional(v.number()),
    scheduledFunctionId: v.optional(v.string()),
    deactivate: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Partial<Doc<'scheduled_tasks'>> = {
      lastExecuted: args.lastExecuted,
    };

    if (args.nextExecution !== undefined) {
      updates.nextExecution = args.nextExecution;
    }

    if (args.scheduledFunctionId !== undefined) {
      updates.scheduledFunctionId = args.scheduledFunctionId;
    }

    if (args.deactivate) {
      updates.isActive = false;
      updates.scheduledFunctionId = undefined;
      updates.nextExecution = undefined;
    }

    await ctx.db.patch(args.taskId, updates);
    return null;
  },
});

// Internal mutation to update task chat ID
export const updateTaskChatId = internalMutation({
  args: {
    taskId: v.id('scheduled_tasks'),
    chatId: v.id('chats'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { chatId: args.chatId });
    return null;
  },
});

// Get task counts and remaining limits for the current user
export const getTaskLimits = query({
  args: {},
  returns: v.object({
    daily: v.object({
      current: v.number(),
      limit: v.number(),
      remaining: v.number(),
    }),
    weekly: v.object({
      current: v.number(),
      limit: v.number(),
      remaining: v.number(),
    }),
    total: v.object({
      current: v.number(),
      limit: v.number(),
      remaining: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const userId = await ensureAuthenticated(ctx);

    // Get all active tasks for the user
    const activeTasks = await ctx.db
      .query('scheduled_tasks')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();

    const counts = {
      daily: activeTasks.filter((t) => t.scheduleType === 'daily').length,
      weekly: activeTasks.filter((t) => t.scheduleType === 'weekly').length,
      total: activeTasks.length,
    };

    return {
      daily: {
        current: counts.daily,
        limit: TASK_LIMITS.daily,
        remaining: TASK_LIMITS.daily - counts.daily,
      },
      weekly: {
        current: counts.weekly,
        limit: TASK_LIMITS.weekly,
        remaining: TASK_LIMITS.weekly - counts.weekly,
      },
      total: {
        current: counts.total,
        limit: TASK_LIMITS.total,
        remaining: TASK_LIMITS.total - counts.total,
      },
    };
  },
});

// Manual trigger for testing
export const triggerScheduledTask = mutation({
  args: { taskId: v.id('scheduled_tasks') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await ensureAuthenticated(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new ConvexError({
        message: 'Scheduled task not found',
        code: ERROR_CODES.INVALID_INPUT,
      });
    }

    // Schedule immediate execution
    await ctx.scheduler.runAfter(0, internal.scheduled_ai.executeTask, {
      taskId: args.taskId,
    });

    return null;
  },
});

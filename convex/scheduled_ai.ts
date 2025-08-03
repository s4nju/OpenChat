'use node';

import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  type UIMessage,
} from 'ai';
import { v } from 'convex/values';
import { searchTool } from '@/app/api/tools';
import { getComposioTools } from '@/lib/composio-server';
import { MODELS_MAP } from '@/lib/config';
import { limitDepth } from '@/lib/depth-limiter';
import { buildSystemPrompt } from '@/lib/prompt_config';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { internalAction } from './_generated/server';

// Execute a scheduled task
export const executeTask = internalAction({
  args: { taskId: v.id('scheduled_tasks') },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Get task details
      const task: Doc<'scheduled_tasks'> | null = await ctx.runQuery(
        internal.scheduled_tasks.getTask,
        { taskId: args.taskId }
      );

      if (!task) {
        // console.error('Task not found:', args.taskId);
        return null;
      }

      if (!task.isActive) {
        // console.log('Task is not active:', args.taskId);
        return null;
      }

      // Get user details
      const user: Doc<'users'> | null = await ctx.runQuery(
        internal.users.getUser,
        { userId: task.userId }
      );

      if (!user) {
        // console.error('User not found for task:', args.taskId);
        return null;
      }

      // Create or get chat for this task
      let chatId = task.chatId;
      if (!chatId) {
        // Create a new chat for this scheduled task
        const { chatId: newChatId } = await ctx.runMutation(
          internal.chats.createChatInternal,
          {
            userId: task.userId,
            title: `Scheduled: ${task.title}`,
            model: 'moonshotai/kimi-k2',
          }
        );
        chatId = newChatId;

        // Update task with the chat ID
        await ctx.runMutation(internal.scheduled_tasks.updateTaskChatId, {
          taskId: args.taskId,
          chatId: newChatId,
        });
      }

      // Get Composio tools if enabled
      let composioTools = {};
      if (task.enabledToolSlugs && task.enabledToolSlugs.length > 0) {
        try {
          composioTools = await getComposioTools(
            task.userId,
            task.enabledToolSlugs
          );
        } catch (_error) {
          // console.error('Failed to load Composio tools:', error);
          // Continue without Composio tools
        }
      }

      // Build system prompt
      const systemPrompt = buildSystemPrompt(
        user,
        undefined, // No persona for scheduled tasks
        task.enableSearch,
        Object.keys(composioTools).length > 0,
        task.timezone,
        task.enabledToolSlugs
      );

      // Get Kimi K2 model
      const selectedModel = MODELS_MAP['moonshotai/kimi-k2'];
      if (!selectedModel) {
        throw new Error('Kimi K2 model not found');
      }

      // Create user message
      const userMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [{ type: 'text', text: task.prompt }],
      };

      // Save user message
      const { messageId: userMsgId } = await ctx.runMutation(
        internal.messages.sendUserMessageToChatInternal,
        {
          chatId,
          role: 'user',
          content: task.prompt,
          parts: [{ type: 'text', text: task.prompt }],
          metadata: {},
        }
      );

      // Execute AI request
      const startTime = Date.now();
      const result = await generateText({
        model: selectedModel.api_sdk,
        system: systemPrompt,
        messages: convertToModelMessages([userMessage]),
        tools: {
          ...(task.enableSearch ? { search: searchTool } : {}),
          ...composioTools,
        },
        stopWhen: stepCountIs(20),
      });

      // Get the generated content and usage from generateText response
      const { content, text, usage } = result;

      // Use the content array directly as parts (from your test output)
      const allParts = content || [];

      // Extract text content for the content field (for search indexing)
      // This matches the chat route pattern
      const textContent = text || '';

      // Limit depth of parts to prevent Convex nesting limit errors
      const depthLimitedParts = limitDepth(allParts, 14);

      // Save assistant message
      await ctx.runMutation(internal.messages.saveAssistantMessageInternal, {
        chatId,
        role: 'assistant',
        content: textContent,
        parentMessageId: userMsgId,
        parts: depthLimitedParts,
        metadata: {
          modelId: selectedModel.id,
          modelName: selectedModel.name,
          includeSearch: task.enableSearch,
          reasoningEffort: 'none',
          serverDurationMs: Date.now() - startTime,
          reasoningTokens: usage?.reasoningTokens || 0,
          cachedInputTokens: usage?.cachedInputTokens || 0,
          inputTokens: usage?.inputTokens || 0,
          outputTokens: usage?.outputTokens || 0,
          totalTokens: usage?.totalTokens || 0,
        },
      });

      // Handle rescheduling based on task type
      const now = Date.now();

      if (task.scheduleType === 'onetime') {
        // One-time task - mark as completed (deactivate)
        await ctx.runMutation(
          internal.scheduled_tasks.updateTaskAfterExecution,
          {
            taskId: args.taskId,
            lastExecuted: now,
            deactivate: true,
          }
        );
      } else {
        // Recurring task (daily or weekly) - calculate next execution
        // We need to parse the original scheduled time to maintain consistent timing
        let nextExecution: number;

        if (task.scheduleType === 'daily') {
          // Parse the scheduled time (HH:MM) and calculate next occurrence
          const [hours, minutes] = task.scheduledTime.split(':').map(Number);
          const nextRun = new Date(now);
          nextRun.setHours(hours, minutes, 0, 0);
          // Add days until we're in the future
          while (nextRun.getTime() <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
          nextExecution = nextRun.getTime();
        } else {
          // Weekly - parse day:HH:MM
          const [dayStr, timeStr] = task.scheduledTime.split(':');
          const targetDay = Number.parseInt(dayStr, 10);
          const [hours, minutes] = timeStr.split(':').map(Number);

          const nextRun = new Date(now);
          const currentDay = nextRun.getDay();
          const daysToTarget = (targetDay - currentDay + 7) % 7;

          nextRun.setDate(nextRun.getDate() + daysToTarget);
          nextRun.setHours(hours, minutes, 0, 0);

          // If this week's occurrence is in the past, add 7 days
          if (nextRun.getTime() <= now) {
            nextRun.setDate(nextRun.getDate() + 7);
          }
          nextExecution = nextRun.getTime();
        }

        const scheduledFunctionId = await ctx.scheduler.runAt(
          nextExecution,
          internal.scheduled_ai.executeTask,
          { taskId: args.taskId }
        );

        await ctx.runMutation(
          internal.scheduled_tasks.updateTaskAfterExecution,
          {
            taskId: args.taskId,
            lastExecuted: now,
            nextExecution,
            scheduledFunctionId,
          }
        );
      }

      return null;
    } catch (_error) {
      // console.error('Error executing scheduled task:', error);

      // Update task to mark last execution attempt
      await ctx.runMutation(internal.scheduled_tasks.updateTaskAfterExecution, {
        taskId: args.taskId,
        lastExecuted: Date.now(),
      });

      return null;
    }
  },
});

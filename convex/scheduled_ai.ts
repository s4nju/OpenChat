'use node';

import {
  consumeStream,
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import { v } from 'convex/values';
import { fromZonedTime } from 'date-fns-tz';
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
      // console.log('Executing scheduled task:', args.taskId);
      const task: Doc<'scheduled_tasks'> | null = await ctx.runQuery(
        internal.scheduled_tasks.getTask,
        { taskId: args.taskId }
      );

      if (!task) {
        // console.log('Task not found:', args.taskId);
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
        // console.log('User not found for task:', args.taskId);
        return null;
      }

      // Create a new chat for each task execution
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      const { chatId } = await ctx.runMutation(
        internal.chats.createChatInternal,
        {
          userId: task.userId,
          title: `${task.title} - ${currentDate} ${currentTime}`,
          model: 'moonshotai/kimi-k2',
        }
      );

      // Update task with the latest chat ID (for the "View Results" link)
      await ctx.runMutation(internal.scheduled_tasks.updateTaskChatId, {
        taskId: args.taskId,
        chatId,
      });

      // Get Composio tools from user's connected services
      // We use connectors table instead of task.enabledToolSlugs because:
      // 1. The enabledToolSlugs field is not yet implemented in the UI
      // 2. Connectors table tracks actual user connections to external services
      // 3. This ensures only connected services are available as tools
      let composioTools = {};
      let toolkitSlugs: string[] = [];
      try {
        // Get user's connected connectors (Gmail, Google Calendar, Notion, etc.)
        const connectedConnectors = await ctx.runQuery(
          internal.connectors.getConnectedConnectors,
          { userId: task.userId }
        );

        if (connectedConnectors.length > 0) {
          // Convert connector types to Composio toolkit slugs
          // e.g., 'gmail' -> 'GMAIL', 'googlecalendar' -> 'GOOGLECALENDAR'
          toolkitSlugs = connectedConnectors.map((connector) =>
            connector.type.toUpperCase()
          );

          composioTools = await getComposioTools(task.userId, toolkitSlugs);
        }
      } catch (_error) {
        // console.error('Failed to load Composio tools:', error);
        // Continue without Composio tools
      }

      // Build system prompt
      const systemPrompt = buildSystemPrompt(
        user,
        undefined, // No persona for scheduled tasks
        task.enableSearch,
        Object.keys(composioTools).length > 0,
        task.timezone,
        toolkitSlugs // Use derived toolkit slugs from connectors
      );
      // console.log('System prompt:', systemPrompt);

      // Get Kimi K2 model
      const selectedModel = MODELS_MAP['moonshotai/kimi-k2'];
      if (!selectedModel) {
        // console.log('Kimi K2 model not found');
      }
      // console.log('Selected model:', selectedModel);
      // Create user message
      const userMessage: UIMessage = {
        id: Math.random().toString(36).substring(2, 15),
        role: 'user',
        parts: [{ type: 'text', text: task.prompt }],
      };

      // console.log('User message:', userMessage);

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

      // Execute AI request using streamText (same pattern as chat route)
      const startTime = Date.now();

      // Pre-build base metadata before streaming (same as chat route)
      const baseMetadata = {
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        includeSearch: task.enableSearch,
        reasoningEffort: 'none' as const,
      };

      // Initialize usage tracking (same as chat route)
      let finalUsage = {
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      };

      const result = streamText({
        model: selectedModel.api_sdk,
        system: systemPrompt,
        messages: convertToModelMessages([userMessage]),
        tools: {
          ...(task.enableSearch ? { search: searchTool } : {}),
          ...composioTools,
        },
        stopWhen: stepCountIs(5),
        onFinish({ usage }) {
          // Capture usage data (runs on successful completion) - same as chat route
          finalUsage = {
            inputTokens: usage.inputTokens || 0,
            outputTokens: usage.outputTokens || 0,
            reasoningTokens: usage.reasoningTokens || 0,
            totalTokens: usage.totalTokens || 0,
            cachedInputTokens: usage.cachedInputTokens || 0,
          };
        },
      });

      // Consume the stream to ensure it runs to completion (same as chat route)
      await result.consumeStream();

      // Variable to store email content outside the callback
      let emailTextContent = '';

      // Get UI-compatible parts using toUIMessageStreamResponse (same as chat route)
      result.toUIMessageStreamResponse({
        originalMessages: [userMessage],
        sendReasoning: true,
        sendSources: true,
        onFinish: async (Messages) => {
          // Construct final metadata (same as chat route)
          const finalMetadata = {
            ...baseMetadata,
            serverDurationMs: Date.now() - startTime,
            inputTokens: finalUsage.inputTokens,
            outputTokens: finalUsage.outputTokens,
            totalTokens: finalUsage.totalTokens,
            reasoningTokens: finalUsage.reasoningTokens,
            cachedInputTokens: finalUsage.cachedInputTokens,
          };

          // Extract text content for the content field (for search indexing)
          const textContent = Messages.responseMessage.parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('');

          // Extract email content (last text part only)
          const textParts = Messages.responseMessage.parts.filter(
            (part) => part.type === 'text'
          );
          emailTextContent =
            textParts.length > 0 ? textParts.at(-1)?.text || '' : '';

          // Limit depth of parts to prevent Convex nesting limit errors
          const depthLimitedParts = limitDepth(
            Messages.responseMessage.parts,
            14
          );

          // Send email notification after message processing is complete
          if (task.emailNotifications && emailTextContent) {
            const executionDate = `${currentDate} ${currentTime}`;
            // Schedule email mutation to run immediately after this action completes
            await ctx.scheduler.runAfter(
              0,
              internal.email.sendTaskSummaryEmail,
              {
                userId: task.userId,
                taskId: args.taskId,
                taskTitle: task.title,
                taskContent: emailTextContent,
                executionDate,
                chatId,
              }
            );
          }

          // Save assistant message with UI-compatible parts
          await ctx.runMutation(
            internal.messages.saveAssistantMessageInternal,
            {
              chatId,
              role: 'assistant',
              content: textContent,
              parentMessageId: userMsgId,
              parts: depthLimitedParts,
              metadata: finalMetadata,
            }
          );
        },
        consumeSseStream: consumeStream,
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
          let utcDate = fromZonedTime(userDate, task.timezone);

          // Keep adding days until we find the next future occurrence
          while (utcDate.getTime() <= now) {
            userDate.setDate(userDate.getDate() + 1);
            utcDate = fromZonedTime(userDate, task.timezone);
          }

          nextExecution = utcDate.getTime();
        } else {
          // Weekly - parse day:HH:MM
          const [dayStr, timeStr] = task.scheduledTime.split(':');
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
          let utcDate = fromZonedTime(userDate, task.timezone);

          // If this week's occurrence is in the past, add 7 days
          if (utcDate.getTime() <= now) {
            userDate.setDate(userDate.getDate() + 7);
            utcDate = fromZonedTime(userDate, task.timezone);
          }

          nextExecution = utcDate.getTime();
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
      // console.log('Error executing scheduled task:', _error);

      // Update task to mark last execution attempt
      await ctx.runMutation(internal.scheduled_tasks.updateTaskAfterExecution, {
        taskId: args.taskId,
        lastExecuted: Date.now(),
      });

      return null;
    }
  },
});

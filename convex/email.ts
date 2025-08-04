import { Resend } from '@convex-dev/resend';
import { v } from 'convex/values';
import { components } from './_generated/api';
import { internalMutation } from './_generated/server';

// Email validation regex at top level for performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CONTENT_LENGTH = 5000;

// Initialize Resend with the component
export const resend: Resend = new Resend(components.resend, {
  // Enable test mode in development (set to false in production via env var)
  testMode: process.env.NODE_ENV !== 'production',
});

/**
 * Send a task summary email to the user
 * This function is designed to never throw errors that would break task execution
 */
export const sendTaskSummaryEmail = internalMutation({
  args: {
    userId: v.id('users'),
    taskId: v.id('scheduled_tasks'),
    taskTitle: v.string(),
    taskContent: v.string(),
    executionDate: v.string(),
    chatId: v.id('chats'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Get user details to check for email address
      const user = await ctx.db.get(args.userId);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!user.email) {
        return { success: false, error: 'User has no email address' };
      }

      // Validate email format (basic validation)
      if (!EMAIL_REGEX.test(user.email)) {
        return { success: false, error: 'Invalid email format' };
      }

      // Truncate content if too long for email
      let emailContent = args.taskContent;
      let contentTruncated = false;

      if (emailContent.length > MAX_CONTENT_LENGTH) {
        emailContent = `${emailContent.substring(0, MAX_CONTENT_LENGTH)}...`;
        contentTruncated = true;
      }

      // Create email HTML template
      const htmlContent = createEmailTemplate({
        taskTitle: args.taskTitle,
        executionDate: args.executionDate,
        taskContent: emailContent,
        contentTruncated,
        chatId: args.chatId,
        userName: user.name || user.preferredName || 'there',
      });

      // Create plain text version
      const textContent = createTextTemplate({
        taskTitle: args.taskTitle,
        executionDate: args.executionDate,
        taskContent: emailContent,
        contentTruncated,
        chatId: args.chatId,
        userName: user.name || user.preferredName || 'there',
      });

      // Send email using Resend
      await resend.sendEmail(ctx, {
        from: 'OpenChat <noreply@chat.ajanraj.com>',
        to: user.email,
        subject: `Task Complete: ${args.taskTitle}`,
        html: htmlContent,
        text: textContent,
      });

      return { success: true };
    } catch (error) {
      // Log error but don't throw - we never want to break task execution
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Create HTML email template for task summary
 */
function createEmailTemplate({
  taskTitle,
  executionDate,
  taskContent,
  contentTruncated,
  chatId,
  userName,
}: {
  taskTitle: string;
  executionDate: string;
  taskContent: string;
  contentTruncated: boolean;
  chatId: string;
  userName: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Complete: ${escapeHtml(taskTitle)}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 24px;
        }
        .task-info {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .task-info h2 {
            color: #495057;
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        .task-info p {
            margin: 5px 0;
            color: #6c757d;
        }
        .content {
            background-color: #ffffff;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .content h3 {
            color: #343a40;
            margin: 0 0 15px 0;
            font-size: 16px;
        }
        .content-text {
            white-space: pre-wrap;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            color: #495057;
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #007bff;
        }
        .truncated-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 10px;
            margin-top: 15px;
            color: #856404;
            font-size: 14px;
        }
        .view-full-btn {
            display: inline-block;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 500;
            margin-top: 20px;
        }
        .view-full-btn:hover {
            background-color: #0056b3;
        }
        .footer {
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
            margin-top: 30px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>✅ Scheduled Task Complete</h1>
        </div>
        
        <p>Hi ${escapeHtml(userName)},</p>
        
        <p>Your scheduled task has been completed successfully. Here's a summary of the results:</p>
        
        <div class="task-info">
            <h2>${escapeHtml(taskTitle)}</h2>
            <p><strong>Completed:</strong> ${escapeHtml(executionDate)}</p>
        </div>
        
        <div class="content">
            <h3>Task Results:</h3>
            <div class="content-text">${escapeHtml(taskContent)}</div>
            ${contentTruncated ? '<div class="truncated-notice">⚠️ <strong>Content Truncated:</strong> The full results are available in the app. Click the button below to view the complete response.</div>' : ''}
        </div>
        
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://chat.ajanraj.com'}/chat/${chatId}" class="view-full-btn">
            View Full Results
        </a>
        
        <div class="footer">
            <p>This email was sent because you enabled email notifications for this scheduled task.</p>
            <p>You can manage your notification preferences in your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://chat.ajanraj.com'}/settings">account settings</a>.</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Create plain text email template for task summary
 */
function createTextTemplate({
  taskTitle,
  executionDate,
  taskContent,
  contentTruncated,
  chatId,
  userName,
}: {
  taskTitle: string;
  executionDate: string;
  taskContent: string;
  contentTruncated: boolean;
  chatId: string;
  userName: string;
}): string {
  return `Scheduled Task Complete

Hi ${userName},

Your scheduled task has been completed successfully.

Task: ${taskTitle}
Completed: ${executionDate}

Results:
${taskContent}${contentTruncated ? '\n\n[Content truncated - view full results in the app]' : ''}

View full results: ${process.env.NEXT_PUBLIC_APP_URL || 'https://chat.ajanraj.com'}/chat/${chatId}

This email was sent because you enabled email notifications for this scheduled task.
You can manage your notification preferences in your account settings.
`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

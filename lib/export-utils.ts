// lib/export-utils.ts
import type { Message, Chat } from '@/lib/types';

/**
 * Format a timestamp for display in exports
 */
function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (e) {
    return '';
  }
}

/**
 * Export chat as Markdown
 */
export function exportChatAsMarkdown(chat: Chat): string {
  const { title, messages, model, createdAt } = chat;
  
  let markdown = `# ${title}\n\n`;
  
  // Add metadata
  markdown += `- **Date**: ${new Date(createdAt).toLocaleString()}\n`;
  if (model) {
    markdown += `- **Model**: ${model}\n`;
  }
  markdown += '\n---\n\n';
  
  // Add messages
  messages.forEach((message) => {
    const role = message.role === 'user' ? 'User' : 
                 message.role === 'assistant' ? 'Assistant' : 
                 'System';
    
    markdown += `## ${role}`;
    
    if (message.timestamp) {
      markdown += ` (${formatTimestamp(message.timestamp)})`;
    }
    
    markdown += '\n\n';
    markdown += `${message.content}\n\n`;
  });
  
  return markdown;
}

/**
 * Export chat as JSON
 */
export function exportChatAsJSON(chat: Chat): string {
  return JSON.stringify(chat, null, 2);
}

/**
 * Export chat as plain text
 */
export function exportChatAsText(chat: Chat): string {
  const { title, messages, model, createdAt } = chat;
  
  let text = `${title}\n\n`;
  
  // Add metadata
  text += `Date: ${new Date(createdAt).toLocaleString()}\n`;
  if (model) {
    text += `Model: ${model}\n`;
  }
  text += '\n---\n\n';
  
  // Add messages
  messages.forEach((message) => {
    const role = message.role === 'user' ? 'User' : 
                message.role === 'assistant' ? 'Assistant' : 
                'System';
    
    text += `${role}`;
    
    if (message.timestamp) {
      text += ` (${formatTimestamp(message.timestamp)})`;
    }
    
    text += ':\n';
    text += `${message.content}\n\n`;
  });
  
  return text;
}

/**
 * Download content as a file
 */
export function downloadAsFile(content: string, filename: string, mimeType: string): void {
  // Create a blob with the content
  const blob = new Blob([content], { type: mimeType });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a link element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append the link to the body
  document.body.appendChild(link);
  
  // Click the link to trigger the download
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export chat in the specified format
 */
export function exportChat(chat: Chat, format: 'markdown' | 'json' | 'text'): void {
  let content = '';
  let filename = `${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
  let mimeType = '';
  
  switch (format) {
    case 'markdown':
      content = exportChatAsMarkdown(chat);
      filename += '.md';
      mimeType = 'text/markdown';
      break;
    case 'json':
      content = exportChatAsJSON(chat);
      filename += '.json';
      mimeType = 'application/json';
      break;
    case 'text':
      content = exportChatAsText(chat);
      filename += '.txt';
      mimeType = 'text/plain';
      break;
  }
  
  downloadAsFile(content, filename, mimeType);
}

import React from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  return (
    <div key={message.id} className={cn(
        "flex w-full items-start gap-3",
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {/* AI Icon (Rendered first for AI) */}
      {message.role === 'assistant' && (
        <div className="flex-shrink-0 p-1.5 rounded-full bg-muted">
          <Bot className="w-4 h-4" />
        </div>
      )}

      {/* Message Content Bubble */}
      <div className={cn(
          "max-w-[80%] rounded-lg p-3 text-sm", // Common styles
          message.role === 'user'
            ? 'bg-primary text-primary-foreground' // User specific styles
            : 'bg-muted/50 dark:bg-gray-800/50' // Assistant specific styles
        )}
      >
        {/* Basic Markdown-like rendering for code blocks */}
        {message.content.split('```').map((part, index) => {
          if (index % 2 === 1) {
            // Code block part
            const lines = part.split('\n');
            const language = lines[0].trim();
            const code = lines.slice(1).join('\n');
            return (
              <pre key={index} className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md overflow-x-auto my-2 text-xs font-mono">
                {language && <code className="block text-muted-foreground mb-1">{language}</code>}
                <code>{code}</code>
              </pre>
            );
          } else {
            // Regular text part
            return <p key={index} className="whitespace-pre-wrap leading-relaxed">{part}</p>;
          }
        })}
      </div>

      {/* User Icon (Rendered last for User) */}
       {message.role === 'user' && (
         <div className="flex-shrink-0 p-1.5 rounded-full bg-primary text-primary-foreground">
           <User className="w-4 h-4" />
         </div>
       )}
    </div>
  );
}

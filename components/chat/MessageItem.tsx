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

      {/* Message Content Bubble */}
      <div className={cn(
        "rounded-lg p-3 text-sm overflow-hidden", // Base styles without max-width
        message.role === 'user'
        ? 'max-w-[85%] md:max-w-[75%] bg-primary text-primary-foreground' // User specific styles including max-width
        : 'bg-transparent' // Assistant specific styles (no max-width here)
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
          <pre key={index} className="bg-gray-100 dark:bg-gray-900 p-2 md:p-3 rounded-md overflow-x-auto my-2 text-xs font-mono relative"> {/* Responsive padding */}
          {language && <code className="block text-muted-foreground mb-1">{language}</code>}
          <code className="whitespace-pre-wrap break-words">{code}</code>
          </pre>
        );
        } else {
        // Regular text part
        return <p key={index} className="whitespace-pre-wrap leading-relaxed break-words hyphens-auto">{part}</p>; // Added hyphens
        }
      })}
      </div>

    </div>
  );
}

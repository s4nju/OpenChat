import React from "react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

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
        "rounded-lg p-3 text-sm overflow-hidden",
        message.role === 'user'
          ? 'bg-primary text-primary-foreground max-w-[85%] md:max-w-[75%]'
          : 'bg-transparent w-full'
      )}
      >
        {/* Basic Markdown-like rendering for code blocks */}
        {message.content.split('```').map((part, index) => {
          if (index % 2 === 1) {
            // Code block part
            const lines = part.split('\n');
            const language = lines[0].trim();
            const code = lines.slice(1).join('\n');
            return <CodeBlock key={index} language={language} code={code} />;
          } else {
            // Regular text part
            return <p key={index} className="whitespace-pre-wrap leading-relaxed break-words hyphens-auto">{part}</p>;
          }
        })}
      </div>
    </div>
  );
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="relative bg-gray-100 dark:bg-gray-900 rounded-md my-2 group">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        {language && (
          <code className="text-xs text-muted-foreground">{language}</code>
        )}
        <button
          onClick={copyToClipboard}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
          aria-label="Copy code"
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-xs font-mono whitespace-pre-wrap break-words">{code}</code>
      </pre>
    </div>
  );
}

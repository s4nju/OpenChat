import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bot, Loader2 } from "lucide-react"; // Remove User icon import
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { MessageItem } from "./MessageItem"; // <-- Import the actual MessageItem


interface MessageListProps {
  messages: Message[];
  error: string | null;
  chatLoading: boolean;
  // Explicitly match the ref type from the parent component
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({
  messages,
  error,
  chatLoading,
  messagesEndRef,
}: MessageListProps) {
  return (
    <ScrollArea className="flex-1 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {error && !chatLoading && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {messages.length === 0 && !chatLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-20">
            <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary opacity-80" />
            </div>
            <p className="text-lg">How can I help you today?</p>
          </div>
        ) : (
          messages.map((message) => (
            // Use the actual MessageItem component
            <MessageItem key={message.id} message={message} />
          ))
        )}
        {/* Specific loading indicator for assistant response */}
        {chatLoading && (
          <div className="flex w-full items-start gap-3 justify-start"> {/* Always justify-start for loading */}
             <div className="flex-shrink-0 p-1.5 rounded-full bg-muted">
                <Bot className="w-4 h-4" />
             </div>
            <div className="flex-1 rounded-lg p-3 bg-muted/50 dark:bg-gray-800/50 max-w-[80%]">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}

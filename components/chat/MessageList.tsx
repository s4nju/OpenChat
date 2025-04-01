import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bot } from "lucide-react"; // Remove Loader2 import
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { MessageItem } from "./MessageItem"; // <-- Import the actual MessageItem


interface MessageListProps {
  messages: Message[];
  error: string | null;
  chatLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean; // <-- Add isMobile prop
}

export function MessageList({
  messages,
  error,
  chatLoading,
  messagesEndRef,
  isMobile, // <-- Destructure isMobile
}: MessageListProps) {
  // For mobile, we need bottom padding to prevent content from being hidden under the fixed input
  // For desktop, we want no padding for seamless integration
  const bottomPadding = isMobile ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "";

  return (
    // Keep pb-0 for desktop, but use the dynamic bottomPadding for mobile
    <ScrollArea className={cn(
      "flex-1 px-2 pt-2 md:px-4 md:pt-4 overflow-y-auto",
      "overscroll-none scroll-smooth",  // Add smooth scrolling globally
      "scroll-pt-4", // Removed scroll-pb-24 padding
      bottomPadding // This will apply padding only on mobile
    )}>
      <div className="max-w-3xl mx-auto space-y-3 relative">
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
        
        {/* Add extra phantom space at the end for mobile view only */}
        {isMobile && messages.length > 0 && (
          <div className="h-4" /> // 2rem (32px) of invisible space
        )}
        
        {/* Scrolling anchor point */}
        <div ref={messagesEndRef} className={isMobile ? "h-2" : ""} />
      </div>
    </ScrollArea>
  );
}

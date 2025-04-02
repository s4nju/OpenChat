import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: Message[];
  error: string | null;
  chatLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  onExampleClick?: (text: string) => void;
}

export function MessageList({
  messages,
  error,
  chatLoading,
  messagesEndRef,
  isMobile,
  onExampleClick,
}: MessageListProps) {
  // Keep minimal padding for mobile but none for desktop
  const bottomPadding = isMobile ? "pb-[calc(3.5rem+env(safe-area-inset-bottom))]" : "pb-0";

  return (
    <ScrollArea 
      className={cn(
        "flex-1 overflow-y-auto",
        "overscroll-none scroll-smooth",
        "scroll-pt-4",
        bottomPadding
      )}
    >
      <div className="relative mx-auto max-w-3xl px-4 md:px-8">
        {/* Error message */}
        {error && !chatLoading && (
          <Alert variant="destructive" className="mb-4 mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Empty state */}
        {messages.length === 0 && !chatLoading ? (
          <div className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/5 dark:bg-primary/10 mb-6 shadow-inner">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            
            <h2 className="text-xl font-medium mb-2">How can I assist you today?</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Start a conversation by typing a message below. I'm here to help with any questions or tasks.
            </p>
            
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 max-w-2xl">
              {[
                { title: "Next.js App Router", text: "Explain how Server Components and Client Components work together in Next.js 14" },
                { title: "React Performance", text: "What are the most effective ways to optimize React component rendering and prevent unnecessary re-renders?" },
                { title: "TypeScript Best Practices", text: "What TypeScript patterns should I use for type-safe React components with proper prop validation?" },
                { title: "Modern UI Architecture", text: "How should I structure a large-scale Next.js application with multiple themes and authentication?" }
              ].map((suggestion, i) => (
                <div 
                  key={i} 
                  className="flex cursor-pointer flex-col rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 active:bg-muted"
                  onClick={() => onExampleClick?.(suggestion.text)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Use example: ${suggestion.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onExampleClick?.(suggestion.text);
                    }
                  }}
                >
                  <h3 className="text-sm font-medium">{suggestion.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{suggestion.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Message list - remove bottom padding in desktop view
          <div className={cn(
            "flex flex-col space-y-2",
            isMobile ? "py-4" : "pt-4 pb-0"
          )}>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
            
            {/* Empty space only visible during loading to indicate something is happening */}
            {chatLoading && <div className="h-2 w-full" aria-label="Loading response" />}

            {/* Extra space only for mobile */}
            {isMobile && messages.length > 0 && <div className="h-6" />}
            
            {/* Scrolling anchor with no height in desktop mode */}
            <div ref={messagesEndRef} className={isMobile ? "h-2" : "h-0"} />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

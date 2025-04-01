import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils"; // <-- Add import for cn

interface ChatInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
  onStopGenerating: () => void;
  isLoading: boolean;
  isMobile: boolean; // <-- Add isMobile prop
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onStopGenerating,
  isLoading,
  isMobile, // <-- Destructure isMobile
}: ChatInputProps) {
  return (
    // Apply conditional fixed positioning and padding
    <div className={cn(
      "border-t border-border bg-background",
      // Add bottom safe area padding to the existing padding for mobile
      isMobile ? "fixed bottom-0 left-0 right-0 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-20" : "p-4 md:p-6"
    )}>
      {/* Apply conditional width */}
      <form
          onSubmit={onSubmit}
          className={cn(
            "flex items-end gap-2 relative",
            isMobile ? "w-full" : "max-w-3xl mx-auto"
          )}
      >
        <Textarea
          id="chat-input"
          placeholder="Message OpenChat..."
          value={input}
          onChange={onInputChange}
          className="flex-1 resize-none pr-16 min-h-[40px] max-h-[200px] text-sm py-2"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              if (!isLoading && input.trim()) {
                onSubmit() // Call onSubmit without event arg
              }
            }
          }}
          disabled={isLoading}
        />
        {/* Buttons remain absolutely positioned relative to the form */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center">
          {isLoading ? (
            <Tooltip>
              <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" onClick={onStopGenerating} className="h-8 w-8">
                  <StopCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop Generating</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="ghost" size="icon" disabled={!input.trim()} className="h-8 w-8">
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send Message</TooltipContent>
            </Tooltip>
          )}
        </div>
      </form>
      {/* Conditionally render disclaimer - Removed duplicated closing tags */}
       {!isMobile && (
         <p className="text-xs text-center text-muted-foreground mt-2">
            OpenChat can make mistakes. Consider checking important information.
         </p>
       )}
    </div>
  );
}

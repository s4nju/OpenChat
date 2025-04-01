import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, StopCircle } from "lucide-react";

interface ChatInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
  onStopGenerating: () => void;
  isLoading: boolean; // Renamed from chatLoading for clarity in this context
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onStopGenerating,
  isLoading,
}: ChatInputProps) {
  return (
    <div className="p-4 md:p-6 border-border bg-background">
      <form
          onSubmit={onSubmit}
          className="max-w-3xl mx-auto flex items-end gap-2 relative"
      >
        <Textarea
          id="chat-input" // Keep ID if needed for external label or focus management
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
       <p className="text-xs text-center text-muted-foreground mt-2">
          OpenChat can make mistakes. Consider checking important information.
       </p>
    </div>
  );
}

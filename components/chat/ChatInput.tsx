import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, StopCircle, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
  onStopGenerating: () => void;
  isLoading: boolean;
  isMobile: boolean;
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onStopGenerating,
  isLoading,
  isMobile,
}: ChatInputProps) {
  return (
    <div 
      className={cn(
        "bg-background z-20",
        isMobile 
          ? "fixed bottom-0 left-0 right-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] px-2 pt-0" 
          : "px-2 pt-0 pb-2"
      )}
    >
      <div 
        className={cn(
          "rounded-xl border border-input shadow-md bg-background/80 backdrop-blur-sm",
          isMobile ? "w-full" : "max-w-3xl mx-auto"
        )}
      >
        {/* Progress bar at the top */}
        {isLoading && (
          <div className="relative w-full h-1 overflow-hidden bg-muted rounded-t-xl">
            <div className="absolute inset-0">
              <div className="absolute h-full bg-primary animate-[loading_1.5s_ease-in-out_infinite] w-full"></div>
            </div>
          </div>
        )}
        
        <form
          onSubmit={onSubmit}
          className="relative"
        >
          <div className="p-2 pt-1 space-y-2">
            {/* Textarea wrapper with rounded corners */}
            <div className="relative rounded-lg overflow-hidden">
              <Textarea
                id="chat-input"
                placeholder={isLoading ? "AI is generating a response..." : "Message OpenChat..."}
                value={input}
                onChange={onInputChange}
                className={cn(
                  "resize-none min-h-[56px] max-h-[240px] py-2 px-4 w-full",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-75",
                  "focus-visible:ring-offset-0 focus-visible:outline-none",
                  "border-0 shadow-none",
                  "text-base rounded-lg",
                  isLoading && "bg-muted/20 text-muted-foreground"
                )}
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
            </div>
            
            {/* Footer with action buttons */}
            <div className="flex justify-between px-1">
              {/* Left side - hints and attachment */}
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted/50"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </Button>
                
                <span className="ml-2 text-xs text-muted-foreground hidden sm:block">
                  {isLoading ? "" : "Press Enter to send, Shift+Enter for new line"}
                </span>
              </div>
              
              {/* Right side - character count and send/stop button */}
              <div className="flex items-center">
                {input.length > 0 && !isLoading && (
                  <span className="text-xs text-muted-foreground mr-2">
                    {input.length}
                  </span>
                )}
                
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          key="stop-button"
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={onStopGenerating}
                          className="rounded-lg"
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                          <span>Stop</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Stop Generating</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          key="send-button"
                          type="submit"
                          variant="default"
                          size="sm"
                          disabled={!input.trim()}
                          className={cn(
                            "rounded-lg",
                            !input.trim() && "opacity-50"
                          )}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          <span>Send</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Send Message (Enter)</TooltipContent>
                    </Tooltip>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </form>
      </div>
      
      {/* Add custom keyframe animation for the loading bar */}
      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Menu, Share2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Model } from "@/lib/types";

interface ChatHeaderProps {
  selectedModel: string;
  onModelChange: (value: string) => void;
  isLoading: boolean;
  models: Model[];
  filteredModels: Model[];
  error: string | null;
  isMobile: boolean;
  onToggleMobileSheet: () => void;
  chatTitle?: string;
}

export function ChatHeader({
  selectedModel,
  onModelChange,
  isLoading,
  models,
  filteredModels,
  error,
  isMobile,
  onToggleMobileSheet,
  chatTitle = "New Chat",
}: ChatHeaderProps) {
  const currentModel = filteredModels.find(model => model.id === selectedModel);
  const modelName = currentModel?.name || "Select model";

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-[calc(0.5rem+env(safe-area-inset-left))] pr-[calc(0.5rem+env(safe-area-inset-right))] h-14">
        <div className="flex items-center gap-2">
          {/* Mobile menu trigger */}
          {isMobile && (
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 -ml-1" onClick={onToggleMobileSheet}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            </SheetTrigger>
          )}
          
          {/* Chat title without icon */}
          <div className="max-w-[120px] xs:max-w-[160px] sm:max-w-[200px] md:max-w-[300px]">
            <span className="font-medium truncate text-sm" title={chatTitle}>
              {chatTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Model selector - optimized for mobile */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select value={selectedModel} onValueChange={onModelChange} disabled={isLoading || models.length === 0}>
                  <SelectTrigger 
                    className={cn(
                      "h-8 text-xs border-muted bg-background",
                      "max-w-[130px] xs:max-w-[150px] sm:max-w-[160px] md:max-w-[300px] lg:max-w-[400px]",
                      "px-2 sm:px-3", // Tighter padding on smallest screens
                      "transition-all duration-200"
                    )}
                  >
                    <SelectValue className="truncate md:text-ellipsis" placeholder={isLoading ? "Loading..." : "Select model"} />
                  </SelectTrigger>
                  <SelectContent 
                    className="max-w-[250px] sm:max-w-[280px] md:max-w-[300px] lg:max-w-[400px] h-[300px]"
                    align="end"
                    sideOffset={8} // Move dropdown further from trigger for better touch targets
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : models.length === 0 ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        {error ? "Error loading models" : "No models found. Check Settings."}
                      </div>
                    ) : (
                      filteredModels.map((model) => (
                        <SelectItem key={model.id} value={model.id} className="text-xs py-2.5"> {/* Taller height for better touch */}
                          <div className="flex items-center gap-2 w-full">
                            <span className="truncate flex-1 min-w-0" title={model.name}>
                              {model.name}
                            </span>
                            {model.isFree && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0">
                                Free
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Select AI model
            </TooltipContent>
          </Tooltip>

          {/* Share button - only visible on desktop */}
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Share2 className="h-4 w-4" />
                  <span className="sr-only">Share chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Share chat
              </TooltipContent>
            </Tooltip>
          )}

          {/* Options menu - optimized for mobile */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 xs:h-8 xs:w-8 md:h-8 md:w-8 -mr-1 sm:mr-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                More options
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56 sm:w-48" sideOffset={8}>
              {/* Share option - only shown in mobile view */}
              {isMobile && (
                <>
                  <DropdownMenuItem className="text-xs py-3 sm:py-2">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share chat
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem className="text-xs py-3 sm:py-2">Rename chat</DropdownMenuItem>
              <DropdownMenuItem className="text-xs py-3 sm:py-2">Export chat</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs py-3 sm:py-2 text-destructive">Delete chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Menu } from "lucide-react"; // <-- Add Menu icon
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // <-- Add Button for trigger
import { SheetTrigger } from "@/components/ui/sheet"; // <-- Add SheetTrigger
import type { Model } from "@/lib/types";

interface ChatHeaderProps {
  selectedModel: string;
  onModelChange: (value: string) => void;
  isLoading: boolean;
  models: Model[];
  filteredModels: Model[];
  error: string | null;
  isMobile: boolean; // <-- Add isMobile prop
  onToggleMobileSheet: () => void; // <-- Add handler prop
}

export function ChatHeader({
  selectedModel,
  onModelChange,
  isLoading,
  models,
  filteredModels,
  error,
  isMobile, // <-- Destructure isMobile
  onToggleMobileSheet, // <-- Destructure handler
}: ChatHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between pt-2 pl-[calc(0.5rem+env(safe-area-inset-left))] pr-[calc(0.5rem+env(safe-area-inset-right))] pb-2 border-b border-border h-14"> {/* Revert top padding, keep L/R safe area */}
      <div className="flex items-center gap-2"> {/* Group trigger and select */}
        {/* Mobile Sheet Trigger */}
        {isMobile && (
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggleMobileSheet}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          </SheetTrigger>
        )}

        {/* Model Selector */}
        <Select value={selectedModel} onValueChange={onModelChange} disabled={isLoading || models.length === 0}>
          {/* Add max-width and truncate for mobile */}
          <SelectTrigger className="w-auto md:max-w-none h-9 text-sm">
            <SelectValue placeholder={isLoading ? "Loading models..." : "Select a model"} />
          </SelectTrigger>
        <SelectContent className="w-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : models.length === 0 ? (
            <div className="p-2 text-center text-sm text-muted-foreground">
              {error ? "Error loading models" : "No models found. Check Settings."}
            </div>
          ) : (
            filteredModels.map((model) => (
              <SelectItem key={model.id} value={model.id} className="text-sm">
                <div className="flex items-center justify-between w-full gap-2">
                  {/* Add truncate to prevent overflow on mobile */}
                  <span title={model.name} className="truncate">
                    {model.name}
                  </span>
                  {model.isFree && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      Free
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      </div> {/* <-- Close the grouping div */}
      {/* Optional: Add other header elements here if needed, outside the group */}
    </div>
  )
};

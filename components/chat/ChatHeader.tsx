import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Model } from "@/lib/types"; // Import Model type

interface ChatHeaderProps {
  selectedModel: string;
  onModelChange: (value: string) => void;
  isLoading: boolean;
  models: Model[]; // Full list might be needed if filtering logic moves here, or just pass filtered
  filteredModels: Model[]; // Pass the already filtered list
  error: string | null; // To display loading errors
}

export function ChatHeader({
  selectedModel,
  onModelChange,
  isLoading,
  models, // Keep models prop in case we want total count or other logic later
  filteredModels,
  error,
}: ChatHeaderProps) {
  return (
    <div className="flex w-auto items-center justify-start p-2 border-b border-border">
      <Select value={selectedModel} onValueChange={onModelChange} disabled={isLoading || models.length === 0}>
        <SelectTrigger className="w-auto h-9 text-sm">
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
                  <span title={model.name}>
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
      {/* Optional: Add other header elements here if needed */}
    </div>
  );
}

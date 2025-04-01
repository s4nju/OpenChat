import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { Model } from "@/lib/types"; // <-- Correct import path for Model type

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  apiKey: string; // Pass the actual API key for display/refresh logic
  tempApiKey: string;
  onTempApiKeyChange: (value: string) => void;
  showFreeOnly: boolean;
  onShowFreeOnlyChange: (checked: boolean) => void;
  onSaveApiKey: () => void;
  onFetchModels: () => void; // Pass the function directly
  isLoading: boolean; // For refresh button state
  models: Model[]; // For debug info
  selectedModel: string; // For debug info
}

export function SettingsSheet({
  isOpen,
  onOpenChange,
  apiKey,
  tempApiKey,
  onTempApiKeyChange,
  showFreeOnly,
  onShowFreeOnlyChange,
  onSaveApiKey,
  onFetchModels,
  isLoading,
  models,
  selectedModel,
}: SettingsSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {/* SheetTrigger is handled externally by the Sidebar button */}
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-4">
          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenRouter API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={tempApiKey}
              onChange={(e) => onTempApiKeyChange(e.target.value)}
              placeholder="sk-or-..."
            />
            <p className="text-sm text-muted-foreground">
              Stored locally. Get yours from{" "}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenRouter</a>.
            </p>
          </div>
          {/* Free Models Toggle */}
          <div className="flex items-center space-x-2">
            <Switch id="free-only-settings" checked={showFreeOnly} onCheckedChange={onShowFreeOnlyChange} />
            <Label htmlFor="free-only-settings">Show free models only</Label>
          </div>
          {/* Refresh Models Button */}
           <Button variant="outline" size="sm" onClick={onFetchModels} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh Models
          </Button>
          {/* Debug Info */}
          <div className="mt-6 p-4 border rounded-md bg-muted">
            <h3 className="font-medium mb-2 text-sm">Connection Details</h3>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>API Key Set: {apiKey ? "Yes" : "No"}</p>
              <p>Selected Model: {selectedModel || "None"}</p>
              <p>Models Loaded: {models.length}</p>
              <p>Free Models Available: {models.filter((m) => m.isFree).length}</p>
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button onClick={onSaveApiKey}>Save Settings</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

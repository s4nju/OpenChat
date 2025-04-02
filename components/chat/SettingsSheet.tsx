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
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { 
  Loader2, 
  Key, 
  RefreshCcw, 
  Database,
  ExternalLink
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Model } from "@/lib/types";

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  apiKey: string;
  tempApiKey: string;
  onTempApiKeyChange: (value: string) => void;
  showFreeOnly: boolean;
  onShowFreeOnlyChange: (checked: boolean) => void;
  onSaveApiKey: () => void;
  onFetchModels: () => void;
  isLoading: boolean;
  models: Model[];
  selectedModel: string;
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
  // Calculate some stats for display
  const freeModelsCount = models.filter((m) => m.isFree).length;
  const currentModel = models.find(m => m.id === selectedModel);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <div className="flex flex-col h-full justify-between">
          <ScrollArea className="flex-1 pr-2">
            <div className="pr-2">
              <SheetHeader className="mb-5">
                <SheetTitle className="text-xl">Settings</SheetTitle>
                <SheetDescription>
                  Configure your OpenChat experience
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                {/* API Key Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">API Configuration</CardTitle>
                    </div>
                    <CardDescription>
                      Connect to OpenRouter to access AI models
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key" className="text-sm font-medium">
                        OpenRouter API Key
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="api-key"
                          type="password"
                          value={tempApiKey}
                          onChange={(e) => onTempApiKeyChange(e.target.value)}
                          placeholder="sk-or-..."
                          className="font-mono text-xs"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span>Get your key from</span>
                        <a 
                          href="https://openrouter.ai/keys" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary inline-flex items-center hover:underline"
                        >
                          OpenRouter
                          <ExternalLink className="h-3 w-3 ml-0.5" />
                        </a>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Switch 
                        id="free-only-settings" 
                        checked={showFreeOnly} 
                        onCheckedChange={onShowFreeOnlyChange} 
                      />
                      <Label htmlFor="free-only-settings" className="text-sm font-medium">
                        Show free models only
                      </Label>
                      {freeModelsCount > 0 && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {freeModelsCount} available
                        </Badge>
                      )}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onFetchModels} 
                      disabled={isLoading}
                      className="w-full mt-2"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="mr-2 h-4 w-4" />
                      )}
                      Refresh Models
                    </Button>
                  </CardContent>
                </Card>

                {/* Connection Details Section */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="connection-details">
                    <AccordionTrigger className="py-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span>Connection Details</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-md bg-muted p-3 text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">API Key Status:</span>
                          <span className="font-medium">
                            {apiKey ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/10">
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/10">
                                Not Set
                              </Badge>
                            )}
                          </span>
                        </div>

                        <Separator className="my-1" />

                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Selected Model:</span>
                          <span className="font-medium truncate max-w-[180px]" title={currentModel?.name || "None"}>
                            {currentModel?.name || "None"}
                          </span>
                        </div>

                        <Separator className="my-1" />
                        
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Models Available:</span>
                          <span className="font-medium">
                            {models.length} total ({freeModelsCount} free)
                          </span>
                        </div>

                        {currentModel && (
                          <>
                            <Separator className="my-1" />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Provider:</span>
                              <span className="font-medium">
                                {currentModel.provider || "Unknown"}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </ScrollArea>
          
          <SheetFooter className="mt-6 flex-shrink-0 sm:justify-between sm:space-x-2">
            <div className="flex w-full gap-3 flex-col sm:flex-row sm:justify-end">
              <SheetClose asChild>
                <Button variant="outline" className="flex-1 sm:flex-initial sm:min-w-[80px]">Cancel</Button>
              </SheetClose>
              <Button onClick={onSaveApiKey} className="flex-1 sm:flex-initial sm:min-w-[80px]">Save Settings</Button>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  Key,
  RefreshCcw,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Palette,
  Sun,
  Moon,
  MessageSquare,
  Settings,
  Type,
  Maximize,
  Minimize,
  Clock,
  Save,
  Send,
  LayoutGrid,
  Bug,
  Trash,
  Zap,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";
import type { Model, ChatSettings, AppearanceSettings, AdvancedSettings } from "@/lib/types";

interface SettingsDialogProps {
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

  // New settings props
  chatSettings: ChatSettings;
  onChatSettingsChange: (settings: Partial<ChatSettings>) => void;
  appearanceSettings: AppearanceSettings;
  onAppearanceSettingsChange: (settings: Partial<AppearanceSettings>) => void;
  advancedSettings: AdvancedSettings;
  onAdvancedSettingsChange: (settings: Partial<AdvancedSettings>) => void;
  onSaveSettings: () => void;
}

export function SettingsDialog({
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
  chatSettings,
  onChatSettingsChange,
  appearanceSettings,
  onAppearanceSettingsChange,
  advancedSettings,
  onAdvancedSettingsChange,
  onSaveSettings,
}: SettingsDialogProps) {
  // Local state
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState("api");
  const { theme, setTheme } = useTheme();

  // Calculate some stats for display
  const freeModelsCount = models.filter((m) => m.isFree).length;
  const currentModel = models.find(m => m.id === selectedModel);

  // Helper function to toggle API key visibility
  const toggleApiKeyVisibility = () => setShowApiKey(!showApiKey);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-hidden p-0 gap-0 mx-auto rounded-lg sm:rounded-lg">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <DialogTitle className="text-xl">Settings</DialogTitle>
            <DialogDescription>
              Configure your OpenChat experience
            </DialogDescription>
          </DialogHeader>

          <Tabs
            defaultValue="api"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full mt-2"
          >
            <div className="border-b px-2 sm:px-6">
              <TabsList className="w-full justify-start bg-transparent p-0 mb-0 overflow-x-auto flex-nowrap">
                <TabsTrigger
                  value="api"
                  className="data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 sm:px-4 py-2 text-xs sm:text-sm"
                >
                  <Key className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">API</span>
                  <span className="sm:hidden">API</span>
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 sm:px-4 py-2 text-xs sm:text-sm"
                >
                  <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger
                  value="appearance"
                  className="data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 sm:px-4 py-2 text-xs sm:text-sm"
                >
                  <Palette className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Appearance</span>
                  <span className="sm:hidden">UI</span>
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 sm:px-4 py-2 text-xs sm:text-sm"
                >
                  <Settings className="h-4 w-4 mr-1 sm:mr-2" />
                  Advanced
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-3 sm:px-6 pt-3 sm:pt-4 pb-6 max-h-[60vh]">
              <TabsContent value="api" className="m-0 mt-2 space-y-6">
                {/* API Key Card */}
                <Card className="border-2 rounded-md sm:rounded-lg">
                  <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">API Key</CardTitle>
                    </div>
                    <CardDescription>
                      Connect to OpenRouter to access AI models
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key" className="text-sm font-medium">
                        OpenRouter API Key
                      </Label>
                      <div className="relative">
                        <Input
                          id="api-key"
                          type={showApiKey ? "text" : "password"}
                          value={tempApiKey}
                          onChange={(e) => onTempApiKeyChange(e.target.value)}
                          placeholder="sk-or-..."
                          className="font-mono text-xs pr-10"
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                          onClick={toggleApiKeyVisibility}
                          aria-label={showApiKey ? "Hide API key" : "Show API key"}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
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

                    <Separator className="my-2" />

                    {/* Model Preferences */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Model Preferences</h4>

                      <div className="flex items-center space-x-2">
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
                    </div>
                  </CardContent>
                </Card>

                {/* Connection Details Section */}
                <Accordion type="single" collapsible className="w-full mb-4">
                  <AccordionItem value="connection-details">
                    <AccordionTrigger className="py-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span>Connection Details</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-md bg-muted p-3 sm:p-4 text-sm space-y-2 sm:space-y-3 overflow-x-auto">
                        <div className="flex justify-between items-center">
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

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Selected Model:</span>
                          <span className="font-medium truncate max-w-[120px] sm:max-w-[180px]" title={currentModel?.name || "None"}>
                            {currentModel?.name || "None"}
                          </span>
                        </div>

                        <Separator className="my-1" />

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Models Available:</span>
                          <span className="font-medium">
                            {models.length} total ({freeModelsCount} free)
                          </span>
                        </div>

                        {currentModel && (
                          <>
                            <Separator className="my-1" />
                            <div className="flex justify-between items-center">
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
              </TabsContent>

              {/* Chat Settings Tab */}
              <TabsContent value="chat" className="m-0 mt-2 space-y-6">
                <Card className="border-2 rounded-md sm:rounded-lg">
                  <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Chat Experience</CardTitle>
                    </div>
                    <CardDescription>
                      Configure how you interact with OpenChat
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-4">
                    {/* Message History Length */}
                    <div className="space-y-2">
                      <Label htmlFor="message-history" className="text-sm font-medium">
                        Message History Length
                      </Label>
                      <Select
                        value={chatSettings.messageHistoryLength.toString()}
                        onValueChange={(value) => onChatSettingsChange({ messageHistoryLength: parseInt(value) })}
                      >
                        <SelectTrigger id="message-history" className="w-full">
                          <SelectValue placeholder="Select history length" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50 messages</SelectItem>
                          <SelectItem value="100">100 messages</SelectItem>
                          <SelectItem value="200">200 messages</SelectItem>
                          <SelectItem value="500">500 messages</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Number of messages to keep in history per chat
                      </p>
                    </div>

                    <Separator className="my-2" />

                    {/* Auto-save Chats */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-save" className="text-sm font-medium">
                          Auto-save Chats
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically save chats as you type
                        </p>
                      </div>
                      <Switch
                        id="auto-save"
                        checked={chatSettings.autoSaveChats}
                        onCheckedChange={(checked) => onChatSettingsChange({ autoSaveChats: checked })}
                      />
                    </div>

                    <Separator className="my-2" />

                    {/* Send with Enter */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="send-with-enter" className="text-sm font-medium">
                          Send with Enter
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Press Enter to send messages (Shift+Enter for new line)
                        </p>
                      </div>
                      <Switch
                        id="send-with-enter"
                        checked={chatSettings.sendWithEnter}
                        onCheckedChange={(checked) => onChatSettingsChange({ sendWithEnter: checked })}
                      />
                    </div>

                    <Separator className="my-2" />

                    {/* Show Timestamps */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-timestamps" className="text-sm font-medium">
                          Show Timestamps
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Display timestamps on assistant messages (today, yesterday, or date)
                        </p>
                      </div>
                      <Switch
                        id="show-timestamps"
                        checked={chatSettings.showTimestamps}
                        onCheckedChange={(checked) => onChatSettingsChange({ showTimestamps: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Settings Tab */}
              <TabsContent value="appearance" className="m-0 mt-2 space-y-6">
                <Card className="border-2 rounded-md sm:rounded-lg">
                  <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Theme & Display</CardTitle>
                    </div>
                    <CardDescription>
                      Customize the appearance of OpenChat
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-4">
                    {/* Theme Mode */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Theme Mode</h4>

                      <div className="grid grid-cols-3 gap-1 sm:gap-2">
                        <Button
                          type="button"
                          variant={theme === "light" ? "default" : "outline"}
                          className="w-full justify-start py-4 sm:py-6 px-2 sm:px-3"
                          onClick={() => {
                            setTheme("light");
                            onAppearanceSettingsChange({ theme: "light" });
                            // Apply font size immediately
                            document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
                            document.documentElement.classList.add(`font-size-${appearanceSettings.fontSize}`);
                          }}
                        >
                          <Sun className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                          Light
                        </Button>

                        <Button
                          type="button"
                          variant={theme === "dark" ? "default" : "outline"}
                          className="w-full justify-start py-4 sm:py-6 px-2 sm:px-3"
                          onClick={() => {
                            setTheme("dark");
                            onAppearanceSettingsChange({ theme: "dark" });
                            // Apply font size immediately
                            document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
                            document.documentElement.classList.add(`font-size-${appearanceSettings.fontSize}`);
                          }}
                        >
                          <Moon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                          Dark
                        </Button>

                        <Button
                          type="button"
                          variant={theme === "system" ? "default" : "outline"}
                          className="w-full justify-start py-4 sm:py-6 px-2 sm:px-3"
                          onClick={() => {
                            setTheme("system");
                            onAppearanceSettingsChange({ theme: "system" });
                            // Apply font size immediately
                            document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
                            document.documentElement.classList.add(`font-size-${appearanceSettings.fontSize}`);
                          }}
                        >
                          <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                          System
                        </Button>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Font Size */}
                    <div className="space-y-2">
                      <Label htmlFor="font-size" className="text-sm font-medium">
                        Font Size
                      </Label>
                      <Select
                        value={appearanceSettings.fontSize}
                        onValueChange={(value) => {
                          const newFontSize = value as "small" | "medium" | "large";
                          onAppearanceSettingsChange({ fontSize: newFontSize });
                          // Apply font size immediately
                          document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
                          document.documentElement.classList.add(`font-size-${newFontSize}`);
                        }}
                      >
                        <SelectTrigger id="font-size" className="w-full">
                          <SelectValue placeholder="Select font size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator className="my-3" />

                    {/* Compact Mode */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="compact-mode" className="text-sm font-medium">
                          Compact Mode
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Reduce spacing and padding throughout the UI
                        </p>
                      </div>
                      <Switch
                        id="compact-mode"
                        checked={appearanceSettings.compactMode}
                        onCheckedChange={(checked) => {
                          onAppearanceSettingsChange({ compactMode: checked });
                          // Apply compact mode immediately
                          if (checked) {
                            document.documentElement.classList.add('compact-mode');
                          } else {
                            document.documentElement.classList.remove('compact-mode');
                          }
                        }}
                      />
                    </div>

                    <Separator className="my-3" />

                    {/* Message Spacing */}
                    <div className="space-y-2">
                      <Label htmlFor="message-spacing" className="text-sm font-medium">
                        Message Spacing
                      </Label>
                      <Select
                        value={appearanceSettings.messageSpacing}
                        onValueChange={(value) => {
                          const newSpacing = value as "compact" | "comfortable" | "spacious";
                          onAppearanceSettingsChange({ messageSpacing: newSpacing });
                          // Apply message spacing immediately
                          document.documentElement.classList.remove(
                            'message-spacing-compact',
                            'message-spacing-comfortable',
                            'message-spacing-spacious'
                          );
                          document.documentElement.classList.add(`message-spacing-${newSpacing}`);
                        }}
                      >
                        <SelectTrigger id="message-spacing" className="w-full">
                          <SelectValue placeholder="Select message spacing" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="comfortable">Comfortable</SelectItem>
                          <SelectItem value="spacious">Spacious</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Advanced Settings Tab */}
              <TabsContent value="advanced" className="m-0 mt-2 space-y-6">
                <Card className="border-2 rounded-md sm:rounded-lg">
                  <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Advanced Settings</CardTitle>
                    </div>
                    <CardDescription>
                      Configure advanced options for OpenChat
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-4">
                    {/* Debug Mode - Removed for production */}

                    {/* Clear Cache on Startup */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="clear-cache" className="text-sm font-medium">
                          Clear Cache on Startup
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Clear browser cache when the app starts
                        </p>
                      </div>
                      <Switch
                        id="clear-cache"
                        checked={advancedSettings.clearCacheOnStartup}
                        onCheckedChange={(checked) => onAdvancedSettingsChange({ clearCacheOnStartup: checked })}
                      />
                    </div>

                    <Separator className="my-2" />

                    {/* Max Tokens per Message */}
                    <div className="space-y-2">
                      <Label htmlFor="max-tokens" className="text-sm font-medium">
                        Max Tokens per Message
                      </Label>
                      <Select
                        value={advancedSettings.maxTokensPerMessage.toString()}
                        onValueChange={(value) => onAdvancedSettingsChange({ maxTokensPerMessage: parseInt(value) })}
                      >
                        <SelectTrigger id="max-tokens" className="w-full">
                          <SelectValue placeholder="Select max tokens" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1000">1000 tokens</SelectItem>
                          <SelectItem value="2000">2000 tokens</SelectItem>
                          <SelectItem value="4000">4000 tokens</SelectItem>
                          <SelectItem value="8000">8000 tokens</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Maximum number of tokens per message (higher values may increase costs)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-auto flex-shrink-0 py-3 sm:py-4 px-4 sm:px-6 border-t">
            <div className="flex w-full gap-3 flex-col sm:flex-row sm:justify-end">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1 sm:flex-initial sm:min-w-[80px]">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  // Save API key first if we're on the API tab
                  if (activeTab === "api") {
                    onSaveApiKey();
                  }
                  // Then save all settings
                  onSaveSettings();
                }}
                className="flex-1 sm:flex-initial sm:min-w-[80px]"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
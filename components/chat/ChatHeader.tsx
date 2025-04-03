import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Menu, Share2, MoreHorizontal, MessageSquare, Plus, Edit, Download, Trash2, ChevronDown, FileJson, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Model, Chat } from "@/lib/types";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { exportChat } from "@/lib/export-utils";

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
  currentChatId?: string;
  onRenameChat?: (chatId: string, newTitle: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onNewChat?: () => void;
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
  currentChatId = "",
  onRenameChat = () => {},
  onDeleteChat = () => {},
  onNewChat,
}: ChatHeaderProps) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const currentModel = filteredModels.find(model => model.id === selectedModel);
  const modelName = currentModel?.name || "Select model";

  // Create a new chat function
  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      // Fallback if onNewChat is not provided
      const { clearChat } = useChatStore.getState();
      const { selectedModel } = useSettingsStore.getState();
      clearChat(selectedModel);
    }
  };

  const handleOpenRenameDialog = () => {
    setNewTitle(chatTitle);
    setIsRenameDialogOpen(true);
  };

  const handleRenameChat = () => {
    if (currentChatId && newTitle.trim()) {
      onRenameChat(currentChatId, newTitle);
      setIsRenameDialogOpen(false);
    }
  };

  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteChat = () => {
    if (currentChatId) {
      onDeleteChat(currentChatId);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleExportChat = (format: 'markdown' | 'json' | 'text') => {
    if (!currentChatId) return;

    // Find the current chat in the store
    const { chats } = useChatStore.getState();
    const currentChat = chats.find(chat => chat.id === currentChatId);

    if (currentChat) {
      exportChat(currentChat, format);
    }
  };

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-[calc(0.5rem+env(safe-area-inset-left))] pr-[calc(0.5rem+env(safe-area-inset-right))] h-14">
        <div className="flex items-center gap-2">
          {/* Mobile menu trigger */}
          {isMobile && (
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 -ml-1" onClick={onToggleMobileSheet}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          )}

          {/* Chat title */}
          <div className="flex items-center max-w-[150px] xs:max-w-[180px] sm:max-w-[220px] md:max-w-[320px]">
            <span
              className="font-medium truncate text-xs xs:text-sm cursor-pointer hover:underline transition-colors"
              title={chatTitle}
              onClick={handleOpenRenameDialog}
            >
              {chatTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Model selector with improved styling */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select value={selectedModel} onValueChange={onModelChange} disabled={isLoading || models.length === 0}>
                  <SelectTrigger
                    className={cn(
                      "h-8 text-xs border-muted bg-background hover:bg-muted/50",
                      isMobile ? "w-[50vw]" : "max-w-[160px] md:max-w-[300px] lg:max-w-[400px]",
                      "px-1.5 sm:px-3", // Even tighter padding on smallest screens
                      "transition-all duration-200 group"
                    )}
                  >
                    <div className="flex items-center gap-1 w-full overflow-hidden">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 hidden xs:block"></div>
                      <SelectValue
                        className="truncate text-[10px] xs:text-xs"
                        placeholder={isLoading ? "Loading..." : "Select model"}
                      />
                    </div>
                    <ChevronDown className="h-3 w-3 xs:h-3.5 xs:w-3.5 opacity-50 group-hover:opacity-100 transition-opacity ml-0.5 xs:ml-1 flex-shrink-0" />
                  </SelectTrigger>
                  <SelectContent
                    className={cn(
                      "h-[300px]",
                      isMobile
                        ? "fixed inset-x-0 top-[3.5rem] rounded-t-none w-full max-w-none border-x-0"
                        : "max-w-[280px] md:max-w-[300px] lg:max-w-[400px]"
                    )}
                    align={isMobile ? "start" : "end"}
                    side="bottom"
                    sideOffset={isMobile ? 0 : 8}
                    position={isMobile ? "item-aligned" : "popper"}
                    avoidCollisions={false}
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
                        <SelectItem key={model.id} value={model.id} className="text-[10px] xs:text-xs py-3 xs:py-2.5"> {/* Taller height for better touch */}
                          <div className="flex items-center gap-1 xs:gap-2 w-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 opacity-0 hidden xs:block"></div>
                            <span className="truncate flex-1 min-w-0" title={model.name}>
                              {model.name}
                            </span>
                            {model.isFree && (
                              <Badge variant="secondary" className="text-[9px] xs:text-[10px] h-3.5 xs:h-4 px-1 py-0 flex-shrink-0">
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

          {/* Spacer for mobile layout balance */}
          {isMobile && <div className="w-1"></div>}

          {/* Share button - only visible on desktop */}
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/80 transition-colors">
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
                  <Button variant="ghost" size="icon" className="h-9 w-9 xs:h-8 xs:w-8 md:h-8 md:w-8 -mr-1 sm:mr-0 hover:bg-muted/80 transition-colors">
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
              <DropdownMenuItem
                className="text-xs py-3 sm:py-2"
                disabled={!currentChatId}
                onClick={handleOpenRenameDialog}
              >
                <Edit className="h-4 w-4 mr-2" />
                Rename chat
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs py-3 sm:py-2" disabled={!currentChatId}>
                  <Download className="h-4 w-4 mr-2" />
                  Export chat
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <DropdownMenuItem
                    className="text-xs py-3 sm:py-2"
                    onClick={() => handleExportChat('markdown')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs py-3 sm:py-2"
                    onClick={() => handleExportChat('json')}
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON (.json)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs py-3 sm:py-2"
                    onClick={() => handleExportChat('text')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Plain Text (.txt)
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs py-3 sm:py-2 text-destructive"
                disabled={!currentChatId}
                onClick={handleOpenDeleteDialog}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter a new title for this chat"
              className="w-full"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameChat();
                }
              }}
            />
          </div>
          <DialogFooter className="flex sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleRenameChat} disabled={!newTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus,
  Settings,
  Sun,
  Moon,
  PanelLeftClose,
  PanelRightClose,
  MessageSquare,
  X,
  Trash2,
  Edit,
} from "lucide-react";
import type { Chat } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SidebarProps {
  isCollapsed: boolean;
  onNewChat: () => void;
  theme: string | undefined;
  onToggleTheme: () => void;
  onToggleSettings: () => void;
  onToggleSidebar: () => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  chats?: Chat[];
  currentChatId?: string;
  onSelectChat?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onRenameChat?: (chatId: string, newTitle: string) => void;
}

export function Sidebar({
  isCollapsed,
  onNewChat,
  theme,
  onToggleTheme,
  onToggleSettings,
  onToggleSidebar,
  isMobile = false,
  mobileOpen = false,
  onMobileOpenChange,
  chats = [],
  currentChatId = "",
  onSelectChat = () => {},
  onDeleteChat = () => {},
  onRenameChat = () => {},
}: SidebarProps) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [chatToRename, setChatToRename] = useState<{ id: string, title: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");

  // Function to close mobile sheet if in mobile mode
  const handleCloseMobileSheet = () => {
    if (isMobile && onMobileOpenChange) {
      onMobileOpenChange(false);
    }
  };

  // Function to format date to relative time
  const formatChatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Unknown date";
    }
  };

  // Function to handle opening rename dialog
  const handleOpenRenameDialog = (chatId: string, chatTitle: string) => {
    setChatToRename({ id: chatId, title: chatTitle });
    setNewTitle(chatTitle);
    setIsRenameDialogOpen(true);
  };
  
  // Function to handle renaming a chat
  const handleRenameChat = () => {
    if (chatToRename && newTitle.trim()) {
      onRenameChat(chatToRename.id, newTitle);
      setIsRenameDialogOpen(false);
    }
  };

  // The actual sidebar content (used for both desktop and mobile)
  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Header with logo/branding area (mobile shows close button) */}
      <div className={cn(
        "flex h-14 items-center border-b border-border",
        isCollapsed && !isMobile ? "justify-center" : "justify-between px-4"
      )}>
        {(!isCollapsed || isMobile) && (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">OpenChat</span>
          </div>
        )}
        {isCollapsed && !isMobile && (
          <MessageSquare className="h-5 w-5 text-primary" />
        )}
        
        {/* Show close button in mobile view */}
        {isMobile ? (
          <Button
            variant="ghost" 
            size="icon"
            onClick={handleCloseMobileSheet}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        ) : (
          /* Desktop sidebar toggle - only visible on small screens */
          <Button
            variant="ghost" 
            size="icon"
            className="md:hidden"
            onClick={onToggleSidebar}
          >
            {isCollapsed ? <PanelRightClose className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* New Chat Button */}
        <div className={cn("py-3", isCollapsed && !isMobile ? "px-2" : "px-3")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-12 justify-start border border-border hover:bg-muted transition-all duration-300 ease-in-out",
                  isCollapsed && !isMobile ? "w-12 p-0 justify-center" : ""
                )}
                onClick={() => {
                  onNewChat();
                  handleCloseMobileSheet();
                }}
              >
                <Plus className="h-5 w-5 flex-shrink-0" />
                {(!isCollapsed || isMobile) && <span className="ml-2 text-sm transition-opacity duration-300">New Chat</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && !isMobile && <TooltipContent side="right">New Chat</TooltipContent>}
          </Tooltip>
        </div>

        {/* Chat History Section */}
        <ScrollArea className={cn(
          "flex-1",
          isCollapsed && !isMobile ? "px-0" : "px-2"
        )}>
          <div className={cn(
            "pt-2 transition-all duration-300 ease-in-out",
            isCollapsed && !isMobile ? "px-2" : ""
           )}>
            {(!isCollapsed || isMobile) && chats.length > 0 && (
              <div className="mb-2 px-1 py-1 opacity-100 transition-opacity duration-300 ease-in-out">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground">Recent Chats</h3>
                  <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                    {chats.length}
                  </Badge>
                </div>
              </div>
            )}
            
            <div className={cn(
              "space-y-2 transition-all duration-300 ease-in-out",
              isCollapsed && !isMobile ? "space-y-3" : ""
            )}>
              {/* Sort chats by updatedAt timestamp to show newest chats first */}
              {[...chats]
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((chat) => (
                <Tooltip key={chat.id}>
                  <TooltipTrigger asChild>
                    <div className="relative group">
                      <Button
                        variant={chat.id === currentChatId ? "secondary" : "ghost"}
                        className={cn(
                          "w-full h-auto min-h-[3rem] py-2 text-left justify-start font-normal group relative transition-all duration-300 ease-in-out",
                          isCollapsed && !isMobile ? "w-12 h-12 p-0 justify-center mx-auto" : "px-3"
                        )}
                        onClick={() => {
                          onSelectChat(chat.id);
                          handleCloseMobileSheet();
                        }}
                      >
                        <div className={cn(
                          "flex w-full transition-all duration-300 ease-in-out",
                          isCollapsed && !isMobile ? "h-full items-center justify-center" : "items-start"
                        )}>
                          <MessageSquare className={cn(
                            "h-5 w-5 flex-shrink-0 transition-all duration-300 ease-in-out",
                            chat.id === currentChatId ? "text-primary" : "text-muted-foreground",
                            (!isCollapsed || isMobile) && "mr-3 mt-0.5"
                          )} />
                          {(!isCollapsed || isMobile) && (
                            <div className="flex flex-col text-left w-full min-w-0">
                              <span className="truncate font-medium mb-0.5 text-sm">{chat.title}</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {formatChatDate(chat.updatedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </Button>
                      {(!isCollapsed || isMobile) && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 bg-background/80 backdrop-blur-sm py-1 px-1 rounded-md shadow-sm">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleOpenRenameDialog(chat.id, chat.title);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onDeleteChat(chat.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  {isCollapsed && !isMobile && <TooltipContent side="right">{chat.title}</TooltipContent>}
                </Tooltip>
              ))}
              
              {chats.length === 0 && (
                <div className={cn(
                  "px-4 py-6 text-center rounded-lg border border-dashed border-muted-foreground/20 mt-2",
                  isCollapsed && !isMobile ? "hidden" : ""
                )}>
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-2">No chat history yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mx-auto"
                    onClick={() => {
                      onNewChat();
                      handleCloseMobileSheet();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start a new chat
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Footer controls */}
      <div className="mt-auto">
        <Separator className="my-1" />
        <div className={cn(
          "p-3 transition-all duration-300 ease-in-out", 
          isCollapsed && !isMobile ? "flex flex-col items-center gap-2 px-2" : "flex flex-col gap-1.5"
        )}>
          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full h-12 justify-start hover:bg-muted transition-all duration-300 ease-in-out",
                  isCollapsed && !isMobile ? "w-12 p-0 justify-center mx-auto" : ""
                )}
                onClick={() => {
                  onToggleTheme();
                  handleCloseMobileSheet();
                }}
              >
                <div className={cn(
                  "flex items-center transition-all duration-300 ease-in-out",
                  isCollapsed && !isMobile ? "justify-center w-full" : "w-full"
                )}>
                  {theme === "light" ? 
                    <Moon className="h-5 w-5 flex-shrink-0" /> : 
                    <Sun className="h-5 w-5 flex-shrink-0" />
                  }
                  {(!isCollapsed || isMobile) && (
                    <span className="ml-2 text-sm transition-opacity duration-300">{theme === "light" ? "Dark" : "Light"} Mode</span>
                  )}
                </div>
              </Button>
            </TooltipTrigger>
            {isCollapsed && !isMobile && (
              <TooltipContent side="right">
                {theme === "light" ? "Dark" : "Light"} Mode
              </TooltipContent>
            )}
          </Tooltip>

          {/* Settings Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full h-12 justify-start hover:bg-muted transition-all duration-300 ease-in-out",
                  isCollapsed && !isMobile ? "w-12 p-0 justify-center mx-auto" : ""
                )}
                onClick={() => {
                  onToggleSettings();
                  handleCloseMobileSheet();
                }}
              >
                <div className={cn(
                  "flex items-center transition-all duration-300 ease-in-out",
                  isCollapsed && !isMobile ? "justify-center w-full" : "w-full"
                )}>
                  <Settings className="h-5 w-5 flex-shrink-0" />
                  {(!isCollapsed || isMobile) && <span className="ml-2 text-sm transition-opacity duration-300">Settings</span>}
                </div>
              </Button>
            </TooltipTrigger>
            {isCollapsed && !isMobile && <TooltipContent side="right">Settings</TooltipContent>}
          </Tooltip>

          {/* Desktop sidebar toggle - hidden on small screens, not shown in mobile view */}
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "hidden md:flex w-full h-12 justify-start hover:bg-muted transition-all duration-300 ease-in-out",
                    isCollapsed && "w-12 p-0 justify-center mx-auto"
                  )}
                  onClick={onToggleSidebar}
                >
                  <div className={cn(
                    "flex items-center transition-all duration-300 ease-in-out",
                    isCollapsed ? "justify-center w-full" : "w-full"
                  )}>
                    {isCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    {!isCollapsed && <span className="ml-2 text-sm transition-opacity duration-300">Collapse</span>}
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );

  // For desktop we render the sidebar content
  const sidebarElement = !isMobile ? (
    <aside className={cn(
      "h-screen border-r border-border transition-all duration-300 ease-in-out hide-scrollbar",
      isCollapsed ? "w-16 flex flex-col" : "w-64 flex flex-col",
    )}>
      <SidebarContent />
    </aside>
  ) : (
    // For mobile, wrap in Sheet.Content
    <SheetContent side="left" className="p-0 w-full max-w-[280px] sm:max-w-[320px]">
      <SidebarContent />
    </SheetContent>
  );

  // Single instance of the rename dialog regardless of platform
  return (
    <>
      {sidebarElement}
      
      {/* Rename Dialog - Single instance for both mobile and desktop */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat conversation.
            </DialogDescription>
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
    </>
  );
}

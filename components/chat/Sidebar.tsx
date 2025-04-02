import React from "react";
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
} from "lucide-react";

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
}: SidebarProps) {
  // Mock chat history for UI demonstration
  const mockChats = [
    { id: 1, name: "Getting started", date: "Just now" },
    { id: 2, name: "Project ideas", date: "2h ago" },
    { id: 3, name: "Tech recommendations", date: "Yesterday" },
  ];

  // Function to close mobile sheet if in mobile mode
  const handleCloseMobileSheet = () => {
    if (isMobile && onMobileOpenChange) {
      onMobileOpenChange(false);
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
        <ScrollArea className="flex-1 px-2">
          <div className={cn("pt-2 transition-all duration-300 ease-in-out")}>
            {(!isCollapsed || isMobile) && (
              <div className="mb-2 px-1 py-1 opacity-100 transition-opacity duration-300 ease-in-out">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground">Recent Chats</h3>
                  <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                    {mockChats.length}
                  </Badge>
                </div>
              </div>
            )}
            
            <div className="space-y-1.5 transition-all duration-300 ease-in-out">
              {mockChats.map((chat, index) => (
                <Tooltip key={chat.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={index === 0 ? "secondary" : "ghost"}
                      className={cn(
                        "w-full h-12 justify-start font-normal group relative transition-all duration-300 ease-in-out",
                        isCollapsed && !isMobile ? "w-12 p-0 justify-center" : "px-2"
                      )}
                      onClick={handleCloseMobileSheet}
                    >
                      <div className={cn(
                        "flex items-center transition-all duration-300 ease-in-out",
                        isCollapsed && !isMobile ? "justify-center w-full" : "w-full"
                      )}>
                        <MessageSquare className={cn(
                          "h-5 w-5 flex-shrink-0 transition-all duration-300 ease-in-out",
                          index === 0 ? "text-primary" : "text-muted-foreground",
                          (!isCollapsed || isMobile) && "mr-2"
                        )} />
                        {(!isCollapsed || isMobile) && (
                          <div className="flex flex-col items-start text-sm overflow-hidden transition-opacity duration-300 ease-in-out">
                            <span className="truncate w-full">{chat.name}</span>
                            <span className="text-xs text-muted-foreground">{chat.date}</span>
                          </div>
                        )}
                      </div>
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && !isMobile && <TooltipContent side="right">{chat.name}</TooltipContent>}
                </Tooltip>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Footer controls */}
      <div className="mt-auto">
        <Separator className="my-1" />
        <div className={cn(
          "p-3 transition-all duration-300 ease-in-out", 
          isCollapsed && !isMobile ? "flex flex-col items-center gap-2" : "flex flex-col gap-1.5"
        )}>
          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full h-12 justify-start hover:bg-muted transition-all duration-300 ease-in-out",
                  isCollapsed && !isMobile ? "w-12 p-0 justify-center" : ""
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
                  isCollapsed && !isMobile ? "w-12 p-0 justify-center" : ""
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
                    "w-full h-12 justify-start hidden md:flex hover:bg-muted transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-12 p-0 justify-center" : ""
                  )}
                  onClick={onToggleSidebar}
                >
                  <div className={cn(
                    "flex items-center transition-all duration-300 ease-in-out",
                    isCollapsed ? "justify-center w-full" : "w-full"
                  )}>
                    {isCollapsed ? (
                      <PanelRightClose className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <PanelLeftClose className="h-5 w-5 flex-shrink-0" />
                    )}
                    {!isCollapsed && <span className="ml-2 text-sm transition-opacity duration-300">Collapse</span>}
                  </div>
                </Button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Expand Sidebar</TooltipContent>}
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );

  // Render based on mode
  return (
    <TooltipProvider>
      {isMobile ? (
        // Mobile Sheet with Sidebar Content
        <SheetContent
          side="left"
          className="p-0 w-64 border-r border-border bg-background pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]"
        >
          <SheetHeader>
            <SheetTitle className="sr-only">Mobile Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      ) : (
        // Desktop Sidebar
        <div
          data-collapsed={isCollapsed}
          className={cn(
            "group relative flex h-full flex-col bg-background border-r border-border transition-all duration-300 ease-in-out",
            isCollapsed ? "w-16" : "w-64"
          )}
        >
          <SidebarContent />
        </div>
      )}
    </TooltipProvider>
  );
}

import React from "react";
import { useTheme } from "next-themes"; // Import useTheme
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetTrigger } from "@/components/ui/sheet"; // Only trigger needed here
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Plus,
  Settings,
  Sun,
  Moon,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onNewChat: () => void;
  theme: string | undefined;
  onToggleTheme: () => void;
  onToggleSettings: () => void; // Function to trigger sheet opening
  onToggleSidebar: () => void;
}

export function Sidebar({
  isCollapsed,
  onNewChat,
  theme,
  onToggleTheme,
  onToggleSettings,
  onToggleSidebar,
}: SidebarProps) {
  return (
    // TooltipProvider should wrap the component using tooltips
    // It's likely already wrapping the whole app in layout.tsx or page.tsx,
    // but adding it here ensures tooltips work if this component is used standalone.
    // If it causes issues (e.g., nested providers), it can be removed.
    <TooltipProvider>
      <div
        className={cn(
          "flex h-full flex-col bg-muted p-2 border-r border-border transition-all duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "w-16 px-1" : "w-64" // Adjust width and padding when collapsed
        )}
      >
        {/* New Chat Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "mb-4 w-full justify-start gap-2",
                isCollapsed && "justify-center px-0" // Center icon when collapsed
              )}
              onClick={onNewChat}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">New Chat</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">New Chat</TooltipContent>}
        </Tooltip>

        {/* Chat History Area */}
        <ScrollArea className="flex-1">
          {!isCollapsed && (
            <div className="text-sm text-muted-foreground p-2">Chat history (coming soon)</div>
          )}
          {/* Add icons or placeholders for chats when collapsed if needed */}
        </ScrollArea>

        {/* Bottom Controls */}
        <div className={cn("mt-auto border-t border-border pt-2", isCollapsed && "space-y-1")}>
          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? "icon" : "sm"}
                className={cn("w-full justify-start gap-2", isCollapsed && "justify-center")}
                onClick={onToggleTheme}
              >
                {theme === "light" ? <Moon className="h-4 w-4 flex-shrink-0" /> : <Sun className="h-4 w-4 flex-shrink-0" />}
                {!isCollapsed && <span className="whitespace-nowrap">{theme === "light" ? "Dark" : "Light"} Mode</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">{theme === "light" ? "Dark" : "Light"} Mode</TooltipContent>}
          </Tooltip>

          {/* Settings Trigger - Triggers the Sheet in the parent */}
          {/* Note: The Sheet component itself remains in the parent for now */}
          <Tooltip>
            <TooltipTrigger asChild>
              {/* We use the passed onToggleSettings to open the Sheet */}
              <Button variant="ghost" size={isCollapsed ? "icon" : "sm"} className={cn("w-full justify-start gap-2", isCollapsed && "justify-center")} onClick={onToggleSettings}>
                <Settings className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap">Settings</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
          </Tooltip>


          {/* Collapse/Expand Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? "icon" : "sm"}
                className={cn("w-full justify-start gap-2", isCollapsed && "justify-center")}
                onClick={onToggleSidebar}
              >
                {isCollapsed ? (
                  <PanelRightClose className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
                )}
                {!isCollapsed && <span className="whitespace-nowrap">Collapse</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Expand Sidebar</TooltipContent>}
            {!isCollapsed && <TooltipContent side="right">Collapse Sidebar</TooltipContent>}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

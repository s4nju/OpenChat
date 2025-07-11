'use client';

import { Eye, EyeSlash, User } from '@phosphor-icons/react';
import React, { useCallback } from 'react';
import { MessageUsageCard } from '@/app/components/layout/settings/message-usage-card';
import { useUser } from '@/app/providers/user-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import type { Doc } from '@/convex/_generated/dataModel';

// Get the display name - prefer preferredName over full name
const getDisplayName = (user: Doc<'users'> | null): string => {
  if (!user) {
    return 'User';
  }

  if (user.preferredName) {
    return user.preferredName;
  }

  return user.name || 'User';
};

function SettingsSidebarComponent() {
  const { user, hasPremium } = useUser();

  const [showEmail, setShowEmail] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return localStorage.getItem('showEmail') === 'true';
  });

  // Memoize the email masking function
  const maskEmail = useCallback((email?: string) => {
    if (!email) {
      return '';
    }
    const [local, domain] = email.split('@');
    const tld = domain.substring(domain.lastIndexOf('.'));
    const prefix = local.slice(0, 2);
    return `${prefix}*****${tld}`;
  }, []);

  // Memoize the email toggle handler
  const toggleEmailVisibility = useCallback(() => {
    setShowEmail((prev) => {
      localStorage.setItem('showEmail', (!prev).toString());
      return !prev;
    });
  }, []);

  if (!user) {
    return null;
  }

  return (
    <aside className="w-full space-y-6">
      {/* User Info */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <Avatar className="h-24 w-24">
            <AvatarImage alt="Profile" src={user?.image} />
            <AvatarFallback>
              <User className="size-12 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        </div>
        <h2 className="font-semibold text-xl">{getDisplayName(user)}</h2>
        <button
          className="flex items-center gap-1 text-muted-foreground text-sm"
          onClick={toggleEmailVisibility}
          type="button"
        >
          <span>{showEmail ? user.email : maskEmail(user.email)}</span>
          {showEmail ? <EyeSlash size={14} /> : <Eye size={14} />}
        </button>
        {hasPremium && (
          <div className="mt-2">
            <Badge className="font-bold" variant="secondary">
              Pro Plan
            </Badge>
          </div>
        )}
      </div>

      {/* Message Usage */}
      <MessageUsageCard />

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Shortcuts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Search</span>
              <div className="flex items-center space-x-1">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">New Chat</span>
              <div className="flex items-center space-x-1">
                <Kbd>⌘</Kbd>
                <Kbd>Shift</Kbd>
                <Kbd>O</Kbd>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Toggle Sidebar</span>
              <div className="flex items-center space-x-1">
                <Kbd>⌘</Kbd>
                <Kbd>B</Kbd>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const SettingsSidebar = React.memo(SettingsSidebarComponent);

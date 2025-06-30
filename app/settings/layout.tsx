'use client';

import { X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HeaderGoBack } from '@/app/components/header-go-back';
import { SettingsNav } from '@/app/components/layout/settings/settings-nav';
import { SettingsSidebar } from '@/app/components/layout/settings/settings-sidebar';
import { useBreakpoint } from '@/app/hooks/use-breakpoint';
import { useUser } from '@/app/providers/user-provider';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const router = useRouter();
  const isMobile = useBreakpoint(768);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user?.isAnonymous) {
      router.replace('/');
    }
    if (!user) {
      router.replace('/');
    }
  }, [user, router]);

  // Open settings drawer on mobile when accessed
  useEffect(() => {
    if (isMobile) {
      setOpen(true);
    }
  }, [isMobile]);

  if (!user || user?.isAnonymous) {
    return null;
  }

  // Mobile: render settings in a drawer overlay
  if (isMobile) {
    return (
      <Drawer
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            router.back();
          }
        }}
        open={open}
      >
        <DrawerContent>
          <div className="flex h-dvh max-h-[80vh] flex-col">
            <DrawerHeader className="border-border border-b px-6 py-4">
              <DrawerTitle>Settings</DrawerTitle>
              <DrawerClose asChild>
                <Button size="icon" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <SettingsNav />
            <div className="flex-1 overflow-auto">
              <div className="px-6 pt-4 pb-8">{children}</div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: standard layout with sidebar
  return (
    <div className="flex min-h-screen flex-col items-center">
      <div className="w-full max-w-6xl">
        <HeaderGoBack href="/" />
      </div>
      <main className="flex w-full max-w-6xl flex-1 gap-4 p-4 md:flex-row md:p-8">
        <div className="hidden w-full space-y-8 md:block md:w-1/4">
          <SettingsSidebar />
        </div>
        <div className="w-full md:w-3/4 md:pl-12">
          <SettingsNav />
          {children}
        </div>
      </main>
    </div>
  );
}

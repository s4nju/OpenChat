'use client';

import { X } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { SettingsProvider } from '@/app/components/layout/settings/settings-provider';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

type DrawerSettingsProps = {
  trigger: React.ReactNode;
  isOpen: boolean;
  setIsOpenAction: (open: boolean) => void;
};

// Dynamically import the same pages used in the desktop routes so that we
// don't duplicate code. Disable SSR to avoid hydration mismatches within the
// client-side drawer.
const AccountPage = dynamic(
  () => import('@/app/settings/page').then((m) => m.default),
  { ssr: false }
);
const CustomizationPage = dynamic(
  () => import('@/app/settings/customization/page').then((m) => m.default),
  { ssr: false }
);
const HistorySettingsPage = dynamic(
  () => import('@/app/settings/history/page').then((m) => m.default),
  { ssr: false }
);
const AttachmentsPage = dynamic(
  () => import('@/app/settings/attachments/page').then((m) => m.default),
  { ssr: false }
);
const ApiKeysPage = dynamic(
  () => import('@/app/settings/api-keys/page').then((m) => m.default),
  { ssr: false }
);

const NAV_ITEMS = [
  { key: 'account', name: 'Account' },
  { key: 'customization', name: 'Customization' },
  { key: 'history', name: 'History & Sync' },
  { key: 'api-keys', name: 'API Keys' },
  { key: 'attachments', name: 'Attachments' },
] as const;

export function DrawerSettings({
  trigger,
  isOpen,
  setIsOpenAction,
}: DrawerSettingsProps) {
  const [active, setActive] =
    useState<(typeof NAV_ITEMS)[number]['key']>('account');

  const renderContent = () => {
    switch (active) {
      case 'customization':
        return <CustomizationPage />;
      case 'history':
        return <HistorySettingsPage />;
      case 'attachments':
        return <AttachmentsPage />;
      case 'api-keys':
        return <ApiKeysPage />;
      default:
        return <AccountPage />;
    }
  };

  return (
    <Drawer onOpenChange={setIsOpenAction} open={isOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <div className="flex h-dvh max-h-[80vh] flex-col">
          <DrawerHeader className="flex-row items-center justify-between border-border border-b px-6 py-4">
            <DrawerTitle className="font-semibold text-base">
              Settings
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                aria-label="Close settings"
                className="flex size-11 items-center justify-center rounded-full hover:bg-muted focus:outline-none"
                type="button"
              >
                <X className="size-5" />
              </button>
            </DrawerClose>
          </DrawerHeader>

          {/* Drawer-local navigation */}
          <nav className="relative mb-2">
            {/* gradient overlays hinting overflow */}
            <span className="pointer-events-none absolute top-0 left-0 h-full w-8 bg-gradient-to-r from-background" />
            <span className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-background" />

            <ul className="flex gap-1 overflow-x-auto whitespace-nowrap rounded-lg bg-muted px-1 py-1 [scroll-snap-type:x_mandatory]">
              {NAV_ITEMS.map((item) => (
                <li
                  className="shrink-0 [scroll-snap-align:start]"
                  key={item.key}
                >
                  <button
                    className={cn(
                      'rounded-md px-4 py-2 text-center font-medium text-sm',
                      active === item.key
                        ? 'bg-background text-foreground'
                        : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                    )}
                    onClick={() => setActive(item.key)}
                    type="button"
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-1 overflow-auto px-6 pt-4 pb-16">
            <SettingsProvider>{renderContent()}</SettingsProvider>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NAV_ITEMS = [
  { name: 'Account', href: '/settings' },
  { name: 'Customization', href: '/settings/customization' },
  { name: 'History & Sync', href: '/settings/history' },
  { name: 'Models', href: '/settings/models' },
  { name: 'API Keys', href: '/settings/api-keys' },
  { name: 'Connectors', href: '/settings/connectors' },
  { name: 'Attachments', href: '/settings/attachments' },
] as const;

function SettingsNavComponent() {
  const pathname = usePathname();

  // Determine the active tab by finding the most specific match.
  // This handles nested routes correctly.
  const activeTab = NAV_ITEMS.slice()
    .reverse()
    .find(
      (item) =>
        pathname === item.href ||
        (item.href !== '/settings' && pathname.startsWith(item.href))
    )?.href;

  return (
    <Tabs className="mb-8" value={activeTab}>
      <div className="overflow-x-auto">
        <TabsList className="h-auto p-1 md:w-full">
          {NAV_ITEMS.map((item) => (
            <TabsTrigger
              asChild
              className="flex-1 md:flex-auto"
              key={item.href}
              value={item.href}
            >
              <Link href={item.href}>{item.name}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}

export const SettingsNav = React.memo(SettingsNavComponent);

'use client';

import { Info } from '@phosphor-icons/react';
import Image from 'next/image';
import { useBreakpoint } from '@/app/hooks/use-breakpoint';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
// import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { APP_NAME } from '@/lib/config';
import { AppInfoContent } from './app-info-content';

type AppInfoTriggerProps = {
  trigger?: React.ReactNode;
};

export function AppInfoTrigger({ trigger }: AppInfoTriggerProps) {
  const isMobile = useBreakpoint(768);

  const defaultTrigger = (
    <button
      className="flex w-full cursor-pointer select-none items-center justify-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
      type="button"
    >
      <Info className="size-4" />
      <span className="flex-1 text-left">About {APP_NAME}</span>
    </button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger || defaultTrigger}</DrawerTrigger>
        <DrawerContent className="border-border bg-background">
          <DrawerHeader>
            <Image
              alt={`calm paint generate by ${APP_NAME}`}
              className="h-32 w-full object-cover"
              height={128}
              priority
              src="/banner_ocean.jpg"
              width={400}
            />
            <DrawerTitle className="hidden">{APP_NAME}</DrawerTitle>
            <DrawerDescription className="hidden">
              Your minimalist AI chat companion
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <AppInfoContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl p-0 shadow-xs sm:max-w-md [&>button:last-child]:rounded-full [&>button:last-child]:bg-background [&>button:last-child]:p-1">
        <DialogHeader className="p-0">
          <Image
            alt={`calm paint generate by ${APP_NAME}`}
            className="h-32 w-full object-cover"
            height={128}
            priority
            src="/banner_ocean.jpg"
            width={400}
          />
          <DialogTitle className="hidden">{APP_NAME}</DialogTitle>
          <DialogDescription className="hidden">
            Your minimalist AI chat companion
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <AppInfoContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}

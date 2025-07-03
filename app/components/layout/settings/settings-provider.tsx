'use client';

import { useQuery } from 'convex/react';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useUser } from '@/app/providers/user-provider';
import { api } from '@/convex/_generated/api';

// Define the context type
interface SettingsContextType {
  hasPremium: boolean | undefined;
  products: { premium?: { id: string } } | undefined;
  rateLimitStatus:
    | {
        isPremium: boolean;
        dailyCount: number;
        dailyLimit: number;
        dailyRemaining: number;
        monthlyCount: number;
        monthlyLimit: number;
        monthlyRemaining: number;
        premiumCount: number;
        premiumLimit: number;
        premiumRemaining: number;
        effectiveRemaining: number;
        dailyReset?: number;
        monthlyReset?: number;
        premiumReset?: number;
      }
    | undefined;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();

  const hasPremium = useQuery(api.users.userHasPremium, user ? {} : 'skip');
  const products = useQuery(
    api.polar.getConfiguredProducts,
    user ? {} : 'skip'
  );
  const rateLimitStatus = useQuery(
    api.users.getRateLimitStatus,
    user ? {} : 'skip'
  );

  const isLoading = user
    ? hasPremium === undefined ||
      products === undefined ||
      rateLimitStatus === undefined
    : false;

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      hasPremium,
      products,
      rateLimitStatus,
      isLoading,
    }),
    [hasPremium, products, rateLimitStatus, isLoading]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

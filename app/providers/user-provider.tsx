'use client';
import { useAuthActions } from '@convex-dev/auth/react';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { useConvexAuth, useMutation } from 'convex/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';

export type UserProfile = Doc<'users'>;

type UserContextType = {
  user: UserProfile | null;
  isLoading: boolean;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  // User capabilities and settings
  hasPremium: boolean;
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
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
  initialUser?: null;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const { data: user = null, isLoading: isUserLoading } = useTanStackQuery({
    ...convexQuery(api.users.getCurrentUser, {}),
    // Extended cache for user data to prevent auth flickering
    gcTime: 30 * 60 * 1000, // 30 minutes - user data persists longer
    staleTime: 15 * 60 * 1000, // 15 minutes - consider user data fresh for longer
    retry: 2, // Retry failed auth requests
    refetchOnWindowFocus: false, // Don't refetch user on focus to prevent flicker
    refetchOnMount: 'always', // Always check auth state on mount
  });

  // User capabilities and settings - only fetch when authenticated
  const { data: hasPremium, isLoading: isPremiumLoading } = useTanStackQuery({
    ...convexQuery(api.users.userHasPremium, {}),
    enabled: !!user && !user.isAnonymous,
    // Premium status changes infrequently, cache longer
    gcTime: 15 * 60 * 1000, // 15 minutes
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  const { data: products, isLoading: isProductsLoading } = useTanStackQuery({
    ...convexQuery(api.polar.getConfiguredProducts, {}),
    enabled: !!user && !user.isAnonymous,
    // Product configurations are very stable, cache aggressively
    gcTime: 60 * 60 * 1000, // 60 minutes
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });

  const { data: rateLimitStatus, isLoading: isRateLimitLoading } =
    useTanStackQuery({
      ...convexQuery(api.users.getRateLimitStatus, {}),
      enabled: !!user && !user.isAnonymous,
      // Rate limits update more frequently, shorter cache
      gcTime: 5 * 60 * 1000, // 5 minutes
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    });
  const storeCurrentUser = useMutation(api.users.storeCurrentUser);
  const mergeAnonymous = useMutation(api.users.mergeAnonymousToGoogleAccount);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const attemptedAnon = useRef(false);
  const lastUserId = useRef<Id<'users'> | null>(null);

  // Handle anonymous sign-in
  useEffect(() => {
    if (!(isLoading || isAuthenticated || attemptedAnon.current)) {
      attemptedAnon.current = true;
      signIn('anonymous');
    }
  }, [isLoading, isAuthenticated, signIn]);

  // Helper function to handle anonymous account merging
  const handleAnonymousAccountMerge = useCallback(
    async (anonId: string) => {
      try {
        await mergeAnonymous({
          previousAnonymousUserId: anonId as Id<'users'>,
        });
        localStorage.removeItem('anonymousUserId');
      } catch {
        // Error handling without console
        // You might want to implement proper error reporting here
      }
    },
    [mergeAnonymous]
  );

  // Helper function to handle user storage and merging
  const handleUserStorage = useCallback(
    async (userData: UserProfile) => {
      try {
        const res = await storeCurrentUser({
          isAnonymous: userData.isAnonymous ?? false,
        });
        const anonId = localStorage.getItem('anonymousUserId');

        if (!userData.isAnonymous && res?.isNew && anonId) {
          await handleAnonymousAccountMerge(anonId);
        } else if (!userData.isAnonymous && anonId) {
          localStorage.removeItem('anonymousUserId');
        }
      } catch {
        // Error handling without console
        // You might want to implement proper error reporting here
      }
    },
    [storeCurrentUser, handleAnonymousAccountMerge]
  );

  // Handle user authentication and storage
  useEffect(() => {
    if (!isAuthenticated || isUserLoading || user === null) {
      return;
    }

    if (user && user._id !== lastUserId.current) {
      handleUserStorage(user);
      lastUserId.current = user._id as Id<'users'>;
    }

    if (!user) {
      return;
    }

    if (user.isAnonymous) {
      localStorage.setItem('anonymousUserId', user._id as unknown as string);
    }
  }, [isAuthenticated, user, isUserLoading, handleUserStorage]);

  const signInGoogle = async () => {
    await signIn('google');
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    await updateUserProfile({ updates });
  };

  // Combined loading state for all user-related data
  const combinedLoading = Boolean(
    isLoading ||
    isUserLoading ||
    (user &&
      !user.isAnonymous &&
      (isPremiumLoading || isProductsLoading || isRateLimitLoading))
  );

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading: combinedLoading,
        signInGoogle,
        signOut,
        updateUser,
        // User capabilities and settings
        hasPremium: hasPremium ?? false,
        products,
        rateLimitStatus,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

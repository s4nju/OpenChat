'use client';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
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
  const user = useQuery(api.users.getCurrentUser) ?? null;
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
    if (!isAuthenticated || user === undefined) {
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
  }, [isAuthenticated, user, handleUserStorage]);

  const signInGoogle = async () => {
    await signIn('google');
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    await updateUserProfile({ updates });
  };

  return (
    <UserContext.Provider
      value={{ user, isLoading, signInGoogle, signOut, updateUser }}
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

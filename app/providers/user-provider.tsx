"use client";
import { createContext, useContext, useEffect, useRef } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";

export type UserProfile = Doc<"users">;

type UserContextType = {
  user: UserProfile | null;
  isLoading: boolean;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode; initialUser?: null }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const user = useQuery(api.users.getCurrentUser) ?? null;
  const storeCurrentUser = useMutation(api.users.storeCurrentUser);
  const mergeAnonymous = useMutation(api.users.mergeAnonymousToGoogleAccount);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const attemptedAnon = useRef(false);
  const lastUserId = useRef<Id<"users"> | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !attemptedAnon.current) {
      attemptedAnon.current = true;
      signIn("anonymous");
    }
  }, [isLoading, isAuthenticated, signIn]);

  useEffect(() => {
    if (!isAuthenticated || user === undefined) return;

    if (user && user._id !== lastUserId.current) {
      storeCurrentUser({ isAnonymous: user.isAnonymous });
      lastUserId.current = user._id as Id<"users">;
    }

    if (!user) return;

    if (user.isAnonymous) {
      localStorage.setItem("anonymousUserId", user._id as unknown as string);
    } else {
      const anonId = localStorage.getItem("anonymousUserId");
      if (anonId) {
        mergeAnonymous({ previousAnonymousUserId: anonId as Id<"users"> });
        localStorage.removeItem("anonymousUserId");
      }
    }
  }, [isAuthenticated, user, storeCurrentUser, mergeAnonymous]);

  const signInGoogle = () => signIn("google");
  const updateUser = async (updates: Partial<UserProfile>) => {
    await updateUserProfile({ updates });
  };

  return (
    <UserContext.Provider value={{ user, isLoading, signInGoogle, signOut, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
}

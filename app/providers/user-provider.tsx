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
      (async () => {
        try {
          const res = await storeCurrentUser({ isAnonymous: user.isAnonymous ?? false });
          const anonId = localStorage.getItem("anonymousUserId");
          if (!user.isAnonymous && res?.isNew) {
            if (anonId) {
              try {
                await mergeAnonymous({ previousAnonymousUserId: anonId as Id<"users"> });
              } catch (mergeErr) {
                console.error("Failed to merge anonymous account:", mergeErr);
              }
              localStorage.removeItem("anonymousUserId");
            }
          } else if (!user.isAnonymous && anonId) {
            localStorage.removeItem("anonymousUserId");
          }
        } catch (err) {
          console.error("Failed to store current user:", err);
        }
      })();
      lastUserId.current = user._id as Id<"users">;
    }

    if (!user) return;

    if (user.isAnonymous) {
      localStorage.setItem("anonymousUserId", user._id as unknown as string);
    }
  }, [isAuthenticated, user, storeCurrentUser, mergeAnonymous]);

  const signInGoogle = async () => {
    await signIn("google");
  };
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

# OpenChat Supabase to Convex Migration: Task List

This document outlines the tasks required to migrate the OpenChat application from Supabase to Convex.
Refer to `OPENCHAT_CONVEX_MIGRATION_PRD.md` for detailed requirements and context.

## Phase 1: Setup and Configuration (Assumed Complete by User)

*   [x] **1.1 Install Convex Dependencies**
    *   `convex`
    *   `@convex-dev/auth`
    *   `@auth/core` (specific version, e.g., `0.37.0`)
    *   Command: `bun add convex @convex-dev/auth @auth/core@0.37.0`
*   [x] **1.2 Initialize Convex Project**
    *   Run `npx convex dev` to set up the `convex/` directory and link to a Convex project.
*   [x] **1.3 Set Convex Environment Variables**
    *   `NEXT_PUBLIC_CONVEX_URL` (usually set in `.env.local` by `convex dev`)
    *   `SITE_URL` (e.g., `http://localhost:3000` for local dev)
        *   Command: `npx convex env set SITE_URL http://localhost:3000`
    *   Google OAuth Credentials:
        *   `AUTH_GOOGLE_ID`: From Google Cloud Console.
            *   Command: `npx convex env set AUTH_GOOGLE_ID <your_google_client_id>`
        *   `AUTH_GOOGLE_SECRET`: From Google Cloud Console.
            *   Command: `npx convex env set AUTH_GOOGLE_SECRET <your_google_client_secret>`

## Phase 2: Core Authentication and User Schema Setup (Google First, then Anonymous)

### A. Foundational Schema & General Configuration

*   [x] **2.1 Define `users` Table Schema in `convex/schema.ts`**
    *    Create `convex/schema.ts`.
    *    Import `authTables` from `@convex-dev/auth/server` and spread them into the schema: `...authTables`.
    *    Extend Convex Auth's built-in `users` table with custom fields:
        *   `isAnonymous: v.optional(v.boolean())` (True if guest user)
        *   `dailyMessageCount: v.optional(v.number())`
        *   `dailyResetTimestamp: v.optional(v.number())` (Store as ms timestamp)
        *   `monthlyMessageCount: v.optional(v.number())`
        *   `monthlyResetTimestamp: v.optional(v.number())` (Store as ms timestamp)
        *   `totalMessageCount: v.optional(v.number())`
        *   `preferredModel: v.optional(v.string())`
        *   `isPremium: v.optional(v.boolean())`
        *   *(Convex Auth automatically provides: _id, _creationTime, name, email, image, emailVerified. No manual tokenIdentifier needed).*
    *    Add proper indexes, including an email index for lookups (e.g., `.index("by_email", ["email"])` if not automatically provided by `authTables`).
*   [x] **2.2 Deploy User Schema & Base Auth Config**
    *    Run `npx convex dev` to sync schema changes. Verify `convex/_generated/` files are updated.
    *    Ensure all Convex Auth tables (`authAccounts`, `authSessions`, etc.) and custom user fields/indexes are deployed.
    *    **`convex/auth.config.ts`**: Ensure it's properly configured (usually with `CONVEX_SITE_URL`). Example:
        ```typescript
        // convex/auth.config.ts
        export default {
          providers: [
            {
              domain: process.env.CONVEX_SITE_URL,
              applicationID: "convex",
            },
          ],
        };
        ```
    *    **`convex/http.ts`**: Configure with auth routes.
        ```typescript
        // convex/http.ts
        import { httpRouter } from "convex/server";
        import { auth } from "./auth"; // Assuming auth is exported from convex/auth.ts

        const http = httpRouter();
        auth.addHttpRoutes(http);
        // Add other http routes if any
        export default http;
        ```
*   [x] **2.3 Update Middleware (`middleware.ts`)**
    *    Replace existing Supabase middleware with `convexAuthNextjsMiddleware` from `@convex-dev/auth/nextjs/server`.
        ```typescript
        // middleware.ts
        import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
        // Potentially import createRouteMatcher, nextjsMiddlewareRedirect for custom logic

        export default convexAuthNextjsMiddleware(/* custom handler if needed */);

        export const config = {
          matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
        };
        ```
    *    Configure route protection logic and public routes as needed.
    *    **2.3.1:** Evaluate and adapt CSRF strategy. Convex client SDK calls are typically handled by Convex Auth's security.
    *    **2.3.2:** Update Content Security Policy (CSP) to include Convex domains (e.g., `NEXT_PUBLIC_CONVEX_URL`) and remove Supabase domains.

### B. Google Authentication Implementation

*   [x] **2.4 Configure Convex Auth for Google (Server-Side)**
    *    **`convex/auth.ts`**: Initialize with Google provider.
        ```typescript
        // convex/auth.ts
        import Google from "@auth/core/providers/google";
        import { convexAuth } from "@convex-dev/auth/server";

        export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
          providers: [Google], // Initially only Google
        });
        ```
*   [ ] **2.5 Implement Core User Functions (Google Focus) in `convex/users.ts`**
    *    Create `convex/users.ts`.
    *    Implement essential user management functions, initially focusing on Google-authenticated users:
        *    `getCurrentUser`: Query to get current authenticated user (using `getAuthUserId(ctx)`).
        *    `storeCurrentUser` (or `initializeUser`): Mutation to set up user profile with defaults after first Google sign-in.
        *    `updateUserProfile`: Mutation for users to update their custom profile fields.
        *    Usage limit functions (`resetDailyCountIfNeeded`, `incrementMessageCount`, `checkUsageLimits`, `checkAndIncrementUsage`, `checkFileUploadLimit`) – ensure these differentiate based on `isAnonymous` (which will be false for Google users initially) and `isPremium`.
        *    All functions must use `getAuthUserId(ctx)` for secure access.
        *    Initialize default counters and reset timestamps when a new user is stored.
    *    _Usage limit helpers and default counter initialization still pending._
*   [x] **2.6 Configure Client-Side Auth Provider for Google**
    *    **`app/providers/ConvexProvider.tsx` (or `app/ConvexClientProvider.tsx`)**:
        *    Use `ConvexAuthNextjsProvider` from `@convex-dev/auth/nextjs` (as per user feedback, for scenarios potentially involving or preparing for Server-Side Authentication features).
        *    Create and pass `ConvexReactClient` instance using `NEXT_PUBLIC_CONVEX_URL`.
        *    Ensure it's a "use client" component.
    *    **`app/layout.tsx`**:
        *    Wrap application with this `ConvexClientProvider` at the top level.
        *    Update provider hierarchy: `ConvexClientProvider` (containing `ConvexAuthProvider`) → `UserProvider` → etc.
    *    **`app/providers/user-provider.tsx` (Google Focus)**:
        *    Use `useConvexAuth()` from `convex/react` for auth state (`isAuthenticated`, `isLoading`).
        *    Use `useAuthActions()` from `@convex-dev/auth/react` for `signIn` and `signOut`.
        *    Implement Google sign-in using `signIn("google")`.
        *    Call `storeCurrentUser` (or `initializeUser`) mutation from `convex/users.ts` after successful Google authentication.
        *    Fetch current user data using `useQuery(api.users.getCurrentUser)`.
        *    Initially, `isAnonymous` will be false for Google users.
*   [x] **2.7 Update Basic Auth UI & Logic for Google**
    *    **2.7.1 Update Sign In/Out Functionality (Google)**
        *    Update `app/auth/page.tsx` to use `signIn("google")`.
        *    Update `app/components/layout/user-menu.tsx` to use Convex Auth `signOut`.
        *    Remove Supabase sign out from `app/auth/login/actions.ts` (rename to `.bak` or delete).
    *    **2.7.2 Migrate Auth UI Components (Google)**
        *    Update `app/components/chat/dialog-auth.tsx` and `app/components/chat-input/popover-content-auth.tsx` to use `signIn("google")`.
        *    Remove `lib/api.ts` `signInWithGoogle` function (obsolete).
    *    **2.7.3 Update Auth Callback & Error Handling (Google)**
        *    Convex Auth handles callbacks via `convex/http.ts` routes. Remove `app/auth/callback/route.ts` (rename to `.bak`).
        *    Update `app/auth/error/page.tsx` to handle potential Convex Auth errors.
    *    **2.7.4 Update User Type Usage & Route Protection (Google)**
        *    Replace Supabase user types with Convex user types (e.g., from `api.users.getCurrentUser`) in components like `app/components/layout/user-menu.tsx`.
        *    Ensure route protection in `middleware.ts` and page components (e.g., `app/c/[chatId]/page.tsx`) correctly uses Convex `isAuthenticated`.

### C. Anonymous Authentication & Account Merging Implementation

*   [x] **2.8 Configure Convex Auth for Anonymous (Server-Side)**
    *    **`convex/auth.ts`**: Add Anonymous provider.
        ```typescript
        // convex/auth.ts
        import Google from "@auth/core/providers/google";
        import { Anonymous } from "@convex-dev/auth/providers/Anonymous"; // Add this
        import { convexAuth } from "@convex-dev/auth/server";

        export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
          providers: [
            Google,
            Anonymous({ // Add Anonymous provider
              profile() { // Optional: customize profile for anonymous users
                return { isAnonymous: true };
              }
            })
          ],
        });
        ```
*   [ ] **2.9 Implement Anonymous User Logic & Account Merging in `convex/users.ts`**
    *    Enhance `convex/users.ts`:
        *    `storeCurrentUser` (or `initializeUser`): Ensure it correctly handles anonymous users (e.g., sets `isAnonymous: true` if the profile from `Anonymous` provider indicates it).
        *    **`mergeAnonymousToGoogleAccount` mutation**:
            *   Accepts `previousAnonymousUserId: Id<"users">` (passed from client).
            *   Gets current Google user's ID via `getAuthUserId(ctx)`.
        *   Currently only merges usage counters and marks the account as non-anonymous.
        *   Deleting the original anonymous user record (`ctx.db.delete(previousAnonymousUserId)`).
        *   Data migration for chats, messages, feedback, and attachments will be revisited once those tables exist in Convex.
        *    Ensure usage limit functions correctly apply different limits for `isAnonymous: true` users.
    *    _Data migration postponed until Phase 3._
*   [x] **2.10 Update Client-Side `user-provider.tsx` for Anonymous Auth & Merging**
    *    Modify `app/providers/user-provider.tsx`:
        *    Implement logic to automatically call `signIn("anonymous")` if no authenticated user (Google) and no prior anonymous session exists (e.g., on initial app load or first interaction requiring auth).
        *    Store the `userId` of the anonymous session in `localStorage` (e.g., `localStorage.setItem("anonymousUserId", userId)`).
        *    After a successful `signIn("google")`:
            *   Check `localStorage` for a stored `anonymousUserId`.
            *   If found, call the `api.users.mergeAnonymousToGoogleAccount` mutation, passing the stored ID.
            *   Clear the `anonymousUserId` from `localStorage` after successful merge.
        *    Ensure `storeCurrentUser` is called appropriately for anonymous users too.
*   [x] **2.11 Update Basic Auth UI & Logic for Anonymous Users**
    *    **2.11.1** Remove Old Guest System
        *    Delete `app/api/create-guest/route.ts` (rename to `.bak`).
        *    Remove `API_ROUTE_CREATE_GUEST` from `lib/routes.ts` and `lib/api.ts`.
        *    Delete `createGuestUser` function from `lib/api.ts`.
    *    **2.11.2** Implement UI for Anonymous State
        *    In `app/components/layout/header.tsx` and other relevant UI:
            *   Update logic: `const isLoggedIn = !!user && !user.isAnonymous;`
            *   Keep "Login" button visible for anonymous users to encourage Google sign-in.
            *   Only show full authenticated user UI (UserMenu, avatar) for Google-authenticated users (where `!user.isAnonymous`).
    *    **2.11.3** Finalize Auth Error Handling
        *    Ensure error messages and user feedback are clear for both Google and Anonymous auth flows.
*   [x] **2.12 Update Server-Side Auth Utilities (Deferred to Phase 3.4.x if complex)**
    *   Review `lib/server/api.ts` `validateUserIdentity` function. If it's simple, adapt for Convex Auth. If complex or tightly coupled with other logic being moved in Phase 3, defer.
    *   Remove Supabase client usage from server utilities if not already done.

## Phase 3: Full Database Migration (Chats, Messages, etc.)

*   [x] **3.1 Define Remaining Schema in `convex/schema.ts`**
    *   Add Convex tables for all other data models: `chats`, `messages`, `feedback`, `chat_attachments`, `Logo`, `Order`, `purchases`, `usage_history`.
    *   Use `app/types/database.types.ts` as the source of truth when mapping fields to `v.*` validators.
        *   Map Supabase `Json` and timestamp fields to appropriate Convex validators (e.g., `v.any()`, `v.number()`).
        *   Use `v.id("table")` for references such as `chat_id` or `user_id`.
        *   Represent enums like `orderstatus` using `v.union(v.literal(...))`.
    *   Add helpful indexes for queries (`by_chat_and_creation` for messages, etc.).
    *   Run `bun x convex codegen` to regenerate types after updating the schema.
*   [x] **3.2 Deploy Full Schema**
    *   Run `npx convex dev` (or `npx convex deploy` for production) to push schema changes.
    *   Confirm `convex/_generated/` is refreshed and committed.
*   [x] **3.3 Migrate Database Functions (Queries & Mutations)**
    *   Create a dedicated Convex file for each table (e.g., `convex/chats.ts`, `convex/messages.ts`).
    *   Recreate all Supabase CRUD logic as Convex functions:
        *   Chat helpers: `createChat`, `listChatsForUser`, `updateChatModel`, `deleteChat`.
        *   Message helpers: `sendMessageToChat`, `getMessagesForChat`, `deleteMessage`, `deleteMessageAndDescendants`.
        *   Feedback helpers: `createFeedback`, etc.
    *   Use `query`, `mutation`, and when necessary `action` for side effects (e.g., AI streaming).
    *   Optimize each function with the indexes defined in the schema.
*   [x] **3.4 Refactor Next.js API Routes to Use Convex for Database Interactions**
    *   Identify existing Next.js API routes (under `app/api/`) that handle backend logic.
    *   **Ensure API routes rely on `convexAuthNextjsMiddleware` (from Task 2.3) for initial authentication. Remove any Supabase-specific user identity validation logic (e.g., direct calls to `validateUserIdentity` with a Supabase client) from these routes. The Convex functions invoked by these API routes will use `ctx.auth.getUserIdentity()` or helpers like `getAuthUserId(ctx)` (from Task 2.5) for secure user identification and authorization within Convex.**
    *   **Implement robust error handling in Next.js API routes for Convex function calls, ensuring appropriate client feedback for failures (e.g., validation errors, network issues, permission denied).**
    *   **3.4.1: Refactor `app/api/chat/route.ts` for Convex Database Interactions:**
        *   Retain core logic for AI SDK calls, tool usage, and streaming within the Next.js route.
        *   **3.4.1.1:** Replace Supabase insert for user messages with a Convex mutation.
        *   **3.4.1.2:** In the `onFinish` callback of `streamText`, replace Supabase insert/update operations for assistant messages with corresponding Convex mutations.
            *   *Consider strategies for handling failures during this assistant message save to maintain data consistency or inform the user (e.g., client notification via `dataStream`, server-side retry logic with caution for idempotency).*
        *   **3.4.1.3:** Migrate `incrementUsage` calls: Ensure calls to the (to-be-created or existing) Convex `incrementUsage` function are correctly placed within the Next.js route logic, triggered after successful user message saving and after assistant message reload/update.
        *   **3.4.1.4:** Migrate chat `updated_at` logic: Replace Supabase updates for the chat's `updated_at` timestamp with a Convex mutation, called from the Next.js route after user message saving and assistant message reload/update.
        *   **3.4.1.5:** Adapt `reloadAssistantMessageId` logic:
            *   Translate the Supabase logic for deleting downstream messages (messages with an `id` greater than `reloadAssistantMessageId` for the same `chat_id`) to a Convex mutation.
            *   Ensure the existing assistant message (identified by `reloadAssistantMessageId`) is updated correctly using a Convex mutation.
        *   **3.4.1.6:** Ensure `dataStream.writeData({ userMsgId, assistantMsgId });` correctly uses Convex-generated `Id<"messages">` for both user and assistant messages.
    *   **3.4.2:** Modify `app/api/create-chat/route.ts` to use a Convex mutation for creating the chat in the database. Ensure it returns the new Convex `Id<"chats">`.
    *   **3.4.3:** Modify `app/api/rate-limits/route.ts` to use Convex mutations/queries for checking and updating rate limits, integrating with the user limits defined in the `users` table.
    *   **3.4.4:** Modify `app/api/update-chat-model/route.ts` to use a Convex mutation for updating the chat model in the database.
    *   **3.4.5:** Review and modify any other custom API routes to use Convex functions for all database interactions.
*   [x] **3.5 Migrate File Uploads to Convex File Storage**
    *   **3.5.1: Schema and Backend Logic (`convex/`)**
        *   **Action:** In `convex/schema.ts`, ensure the `chat_attachments` table is defined with `fileId: v.id("_storage")` and an index on `chatId`.
        *   **Action:** Create `convex/files.ts` with the following functions:
            *   `generateUploadUrl`: A mutation that takes no arguments and returns `ctx.storage.generateUploadUrl()`.
            *   `saveFileAttachment`: A mutation that takes `storageId`, `chatId`, and file metadata, verifies auth with `ctx.auth.getUserIdentity()`, and inserts a record into `chat_attachments`.
            *   `getAttachmentsForChat`: A query that takes a `chatId`, fetches the relevant attachments, and gets their downloadable URLs via `ctx.storage.getUrl()`.
    *   **3.5.2: Refactor Client-Side Upload Workflow (`app/components/chat/chat.tsx`)**
        *   **Action:** Implement conditional file handling logic based on the presence of `chatId`.
        *   **Sub-Task 3.5.2.1: New Chat Workflow (Home Page / `chatId` is null)**
            *   When a user selects a file, the `handleFileUpload` function will add the `File` object to a local React state (`files`). No upload occurs yet.
            *   In the `submit` function, after a new chat is created and a `currentChatId` is available, it will iterate through the files in the local state and upload them one by one using the process below.
        *   **Sub-Task 3.5.2.2: Existing Chat Workflow (`chatId` exists)**
            *   The `handleFileUpload` function will be modified to immediately trigger the upload process for each selected file.
            *   It will not add the file to the local `files` state, but instead directly call a new `uploadAndSaveFile(file, chatId)` helper function.
        *   **Sub-Task 3.5.2.3: Create `uploadAndSaveFile` Helper**
            *   This new async function will encapsulate the upload logic:
                1.  Call the `generateUploadUrl` mutation.
                2.  Perform a `POST` request to the returned `uploadUrl` with the file data.
                3.  On success, parse the response to get the `storageId`.
                4.  Call the `saveFileAttachment` mutation with the `storageId` and other file metadata.
                5.  Use toasts to provide user feedback on success or failure.
    *   **3.5.3: Update UI to Display Attachments**
        *   **Action:** In `app/components/chat/chat.tsx`, use the `useQuery(api.files.getAttachmentsForChat, { chatId })` hook to fetch attachments for the current conversation.
        *   **Action:** Pass the fetched attachments down to the `Conversation` and `Message` components to be rendered, using the `url` from the query result for links or image previews.
        *   **Action:** Ensure the `experimental_attachments` prop for the `useChat` hook is correctly populated, likely from the results of the `getAttachmentsForChat` query, to maintain integration with the Vercel AI SDK.
    *   **3.5.4: Final Cleanup**
        *   **Action:** Once the new implementation is verified, rename the old `lib/file-handling.ts` file to .bak extension.
        *   **Action:** Remove any remaining references to the old file upload logic from the codebase.
*   [x] **3.6 Implement Usage Limits**
    *   Investigate existing Supabase implementation (relevant code sections or database triggers/policies) to understand how usage limits (e.g., `daily_message_count` from `users` table) are tracked and enforced for anonymous and registered users. (This may require reading specific Supabase-related files later).
    *   Implement logic in relevant Convex mutations (e.g., `sendMessageToChat` or a dedicated message creation mutation) to check and update usage counts stored in the `users` table before proceeding with the core action.
    *   Ensure limit logic correctly differentiates based on the `users.isAnonymous` field and potentially `users.isPremium`.
    *   Provide helpers for resetting daily and monthly counters (similar to Phase 2 usage helpers) and schedule them with Convex crons if needed.
*   [x] **3.7 Update Application Logic to Use Convex Functions**
    *   **3.7.1: Refactor Chat History Components (Self-Contained Data)**
        *   **Objective:** Make the chat history components responsible for their own data fetching and mutations, removing the dependency on props passed from the `Header`.
        *   **Files:** `app/components/history/drawer-history.tsx`, `app/components/history/command-history.tsx`, `app/components/layout/header.tsx`
        *   **Actions:**
            *   In `drawer-history.tsx` and `command-history.tsx`:
                *   Remove `chatHistory`, `onSaveEdit`, `onConfirmDelete` props.
                *   Add `useQuery(api.chats.listChatsForUser)` to fetch data.
                *   Add `useMutation` hooks for `api.chats.deleteChat` and a new `api.chats.updateChatTitle`.
                *   Update internal handlers to call these hooks.
            *   In `app/components/layout/header.tsx`:
                *   Remove the `useChats()` hook and its related state/handlers.
                *   Render `<HistoryTrigger />` without passing any props.
    *   **3.7.2: Refactor Core Chat Component (`chat.tsx`)**
        *   **Objective:** Replace the IndexedDB-backed state management (`useChats`, `useMessages`) with direct Convex hooks.
        *   **File:** `app/components/chat/chat.tsx`
        *   **Actions:**
            *   Remove all usage of `useChats()` and `useMessages()`.
            *   Fetch messages with `useQuery(api.messages.getMessagesForChat, ...)` and sync to the Vercel AI SDK's `useChat` state via `setMessages`.
            *   Replace `createNewChat` and `updateChatModel` calls with `useMutation` hooks.
            *   Refactor `handleDelete` to use a `useMutation` hook for `api.messages.deleteMessageAndDescendants`.
            *   Simplify component by removing manual cache management (`cacheAndAddMessage`, etc.).
    *   **3.7.3: Refactor Message Feedback Submission**
        *   **Objective:** Migrate feedback submission to a Convex mutation.
        *   **File:** `components/common/feedback-form.tsx` (Note: This is the actual implementation file, not the widget wrapper).
        *   **Actions:**
            *   In the form submission handler, replace the existing logic with a `useMutation` hook for `api.feedback.createFeedback`.
    *   **3.7.4: Clean Up Authentication Flow (`user-menu.tsx`)**
        *   **Objective:** Remove obsolete IndexedDB cleanup logic from the sign-out process.
        *   **File:** `app/components/layout/user-menu.tsx`
        *   **Actions:**
            *   In the `handleSignOut` function, remove calls to `resetMessages()`, `resetChats()`, and `clearAllIndexedDBStores()`.
            *   Remove the `useChats` and `useMessages` hooks from the component.
    *   **3.7.5: Decommission `lib/api.ts`**
        *   **Objective:** Remove the file containing legacy Supabase helper functions.
        *   **Actions:**
            *   Confirm that all logic from this file (rate limiting, chat updates) has been moved to Convex functions or made redundant by direct hook usage in the UI.
            *   Delete the file `lib/api.ts`.

*   [x] **3.8 Revisit Anonymous Account Merging**
    *   Once the `chats`, `messages`, and `chat_attachments` tables are created in Convex,
        update `mergeAnonymousToGoogleAccount` to migrate those records from the former anonymous user.
    *   Ensure the anonymous user record is deleted after migration and verify related data is reassigned correctly.
    *   Remove any leftover Supabase migration logic if still present.

## Phase 4: Cleanup

*   [x] **4.1 Remove IndexedDB Usage**
    *   Delete `lib/chat-store/persist.ts`.
    *   Remove all imports and function calls related to IndexedDB from the codebase.
    *   Adjust any client-side state management in `lib/chat-store/` that relied on it.
*   [x] **4.2 Remove Supabase Code and Configuration**
    *   Delete the `lib/supabase/` directory.
    *   Delete `utils/supabase/middleware.ts` (if not already done).
    *   Remove all Supabase client instantiations and direct Supabase API calls.
    *   Delete `app/types/database.types.ts` (as `convex/schema.ts` is the new source of truth).
    *   Remove Supabase-specific environment variables from `.env.local` and other configurations.
    *   Search globally for 'supabase' and 'Supabase' to catch any remaining references in comments, strings, or utility functions.
    *   **4.2.1:** Review and update/remove CSRF token fetching in `app/layout-client.tsx` based on the new CSRF strategy (from Task 2.6.1).
*   [x] **4.3 Uninstall Supabase Dependencies**
    *   Run `bun remove @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/ssr dexie` (and any other related packages like `idb-keyval` if it was also used).
*   [ ] **4.4 Final Verification and Testing**
    *   Thoroughly test all aspects of the application:
        *   Google Sign-In / Sign-Out.
        *   Session persistence.
        *   User profile display and updates.
        *   All chat functionalities (creating chats, sending/viewing messages, attachments if applicable).
        *   Feedback submission.
        *   Any other features relying on the database (Logo, Order, purchases, usage_history if they are still in scope).
    *   Check browser console for errors/warnings thoroughly.
    *   Test on different browsers if applicable.
    *   Review application performance.

This task list should guide the implementation process.

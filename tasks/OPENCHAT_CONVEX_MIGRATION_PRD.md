# Product Requirements Document: OpenChat Supabase to Convex Migration

## 1. Introduction & Overview

*   **Project:** OpenChat Backend Migration
*   **Date:** May 24, 2025
*   **Goal:** To migrate the OpenChat application's backend services, specifically authentication and database functionalities, from Supabase to Convex.
*   **Background:** This migration aims to leverage Convex's real-time capabilities, reactive data model, integrated authentication, and potentially simplify the backend infrastructure. The transition focuses on a clean switch without migrating existing user data.

## 2. Goals

*   Successfully migrate user authentication from Supabase Auth to Convex Auth, with an initial focus on Google OAuth, followed by the implementation of anonymous user access and account merging capabilities.
*   Successfully migrate the application database from Supabase's PostgreSQL to the Convex database.
*   Maintain the existing User Interface (UI) and User Experience (UX) for authentication and core chat functionalities.
*   Completely remove all Supabase-related dependencies, client code, and configurations.
*   Eliminate the use of IndexedDB for client-side caching, relying on Convex's built-in capabilities.
*   Ensure the application remains fully functional and stable post-migration for all new user interactions and data.

## 3. Scope

### In Scope:
*   **Authentication:**
    *   Implementation of Convex Auth with Google as the OAuth provider as the initial step.
    *   Replacement of all Supabase authentication calls with Convex Auth APIs.
    *   Ensuring proper session management and authentication state handling via Convex.
    *   Subsequent implementation of anonymous user authentication using Convex Auth's Anonymous provider.
    *   Development of logic for merging anonymous user activity to a Google-authenticated account.
*   **Database:**
    *   Creation of a new Convex database schema in `convex/schema.ts` based on the existing type definitions in `app/types/database.types.ts`.
    *   Implementation of appropriate database indexes in Convex for optimal query performance.
    *   Updating all database queries, mutations, and subscriptions (if any) to use Convex APIs and server functions.
    *   Updating any Next.js API routes that previously used the Supabase client to now use Convex actions or HTTP actions where appropriate.
*   **Code & Dependencies:**
    *   Installation of `convex`, `@convex-dev/auth`, `@auth/core`, and any other necessary Convex-related dependencies using `bun`.
    *   Complete removal of Supabase SDKs (`@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`, `@supabase/ssr`, etc.) and their usage.
    *   Removal of `dexie` and any custom IndexedDB wrapper code.
*   **Configuration:**
    *   Setup and configuration of Convex environment variables (project URL, Google OAuth credentials, `SITE_URL`).
    *   Removal of all Supabase-specific configuration files and environment variables.
*   **Frontend Integration:**
    *   Updating Next.js components, pages (App Router), and context providers to integrate with Convex for both authentication and data.
*   **File Uploads:**
    *   Migration of file upload functionality from Supabase Storage to Convex File Storage.

### Out of Scope:
*   **Existing Data Migration:** Migration of any existing user data or chat history from Supabase to Convex. The project specifies this as a "clean transition."
*   **UI/UX Overhaul:** Significant changes to the existing application appearance or user flows, beyond what is necessary to integrate Convex Auth.
*   **New Feature Development:** Addition of any new application features not directly related to the backend migration.
*   **Additional OAuth Providers:** Initial implementation will focus on Google OAuth. Support for other providers is out of scope for this phase.

## 4. Target Users

*   **End-Users of OpenChat:** Should experience a seamless transition with no disruption to their ability to sign up/log in (with Google) and use chat functionalities.
*   **Developers:** Will interact with and maintain the new Convex-based backend.

## 5. Requirements

### Functional Requirements (FR)
*   **FR1: Google Authentication:** Users must be able to sign up and log in to OpenChat using their Google accounts via Convex Auth.
*   **FR2: Session Management:** Authenticated user sessions must be securely managed and persisted by Convex Auth.
*   **FR3: User Profile Display:** Basic user profile information obtained from Google (name, email, profile picture) should be accessible and displayable within the application.
*   **FR4: Core Chat Functionality:** All existing chat features (e.g., creating new chat sessions, sending messages, receiving/displaying messages, listing chats) must remain fully functional using the Convex database.
*   **FR5: Auth State Synchronization:** The UI must reactively update to reflect changes in the user's authentication state (e.g., logged in, logged out).
*   **FR6: Data Integrity for New Data:** All new data (users, chats, messages) generated after the migration must be correctly stored and retrieved from Convex.
*   **FR7: Anonymous User Access:** Anonymous users must be able to create chats and send messages, subject to specific usage limits. The UI should treat anonymous users as "not logged in" (showing login button) to encourage Google sign-in while still providing full chat functionality.
*   **FR8: Account Merging:** If an anonymous user subsequently signs in with Google, their previous activity (chats, messages) must be merged with their authenticated Google account.
*   **FR9: File Uploads and Attachments:** Users must be able to upload files (e.g., images, documents) and attach them to chats, with these files being stored and managed by Convex File Storage.

### Technical Requirements (TR)
*   **TR1: Convex Auth Implementation:** Utilize the `@convex-dev/auth` package with `@auth/core`. Google OAuth provider integration will be implemented first, followed by the Anonymous provider.
*   **TR2: Convex Schema Definition:** The database schema must be defined in `convex/schema.ts` using `defineSchema` and `defineTable`. This includes accurately reflecting the structure previously defined in `app/types/database.types.ts` (especially for tables like `chats`, `messages`, etc.) and ensuring the `users` table specifically accommodates fields for OAuth profiles, anonymous status, usage limits, and preferences. Appropriate indexes must be defined for query performance across all tables.
*   **TR3: Convex Server Functions:** All data access logic (reads, writes, updates) must be encapsulated in Convex query (`query`) and mutation (`mutation`) functions within the `convex/` directory.
*   **TR4: Convex Client Integration:** The Next.js frontend must use the Convex React client (`convex/react`) and the generated `api` object for interacting with backend functions.
*   **TR5: Dependency Management:** All Supabase-related npm packages must be removed, and Convex packages added, using `bun`.
*   **TR6: IndexedDB Removal:** All client-side code using IndexedDB (e.g., via `dexie` in `lib/chat-store/persist.ts`) must be removed.
*   **TR7: Environment Configuration:** The application must be configurable using environment variables for Convex deployment URL, Google OAuth credentials, and frontend site URL.
*   **TR8: Next.js App Router Compatibility:** All changes must be compatible with the Next.js App Router architecture.
*   **TR9: Middleware Update:** The Next.js middleware (`middleware.ts`) must be updated to use Convex Auth for route protection and session handling.
*   **TR10: Error Handling:** Implement appropriate error handling for Convex operations (auth, database) and communicate errors gracefully to the user.
*   **TR11: Account Merging Logic:** Develop a custom server-side (Convex mutation) mechanism to merge data from an anonymous user session to a Google-authenticated user session.
*   **TR12: Usage Limits:** Implement logic within Convex mutations to enforce distinct usage limits for anonymous versus authenticated users, based on the existing application's rules.
*   **TR13: CSRF Strategy Adaptation:** Evaluate the existing CSRF protection mechanism and adapt it for the Convex architecture. This may involve new strategies for Convex client SDK calls and any remaining HTTP endpoints.
*   **TR14: CSP Update:** Update the Content Security Policy (CSP) in the Next.js middleware to include necessary Convex domains (e.g., project URL, file storage URLs) and any other new domains introduced.
*   **TR15: API Route Migration:** Refactor logic from existing Next.js API routes (e.g., under `app/api/`) that interact with the backend into appropriate Convex actions (for operations with side effects like third-party API calls) and mutations (for state changes).
*   **TR16: Convex File Storage Implementation:** Implement file uploads using Convex File Storage. This includes client-side logic for initiating uploads (e.g., using `useMutation(api.files.generateUploadUrl)`) and server-side Convex functions to handle storage and associate file metadata (e.g., in `chat_attachments` table) with chats/messages.

### Non-Functional Requirements (NFR)
*   **NFR1: Performance:** The performance of authentication and database operations with Convex should be comparable to or better than the previous Supabase implementation.
*   **NFR2: Security:** Standard security practices must be maintained for handling OAuth credentials, user sessions, and data within Convex.
*   **NFR3: Scalability:** The Convex backend should be able to handle the expected load of OpenChat users (Convex is designed for scalability).
*   **NFR4: Maintainability:** The new Convex-based backend code should be well-organized and maintainable.
*   **NFR5: Developer Experience:** The new Convex-based development workflow should be efficient and provide good debugging capabilities.

## 6. Success Criteria

*   All Functional Requirements (FR1-FR8) are met and verified.
*   Users can successfully sign up and log in using Google OAuth.
*   Anonymous users can access chat functionality while seeing the Login button (encouraging Google sign-in).
*   Account merging works correctly when anonymous users sign in with Google.
*   All core chat functionalities are working correctly with data stored in and retrieved from Convex.
*   A code review confirms adherence to Convex best practices and the clean, complete removal of old backend code (Supabase, IndexedDB).
*   The `package.json` no longer lists Supabase or Dexie dependencies.
*   The application builds successfully and runs without errors attributable to the backend migration.
*   Manual end-to-end testing of all critical user flows is completed successfully.
*   Environment variable setup for Convex is documented and functional.

## 7. Open Questions & Assumptions

*   **Assumption:** The user (developer) will provide the necessary Google OAuth Client ID and Secret.
*   **Assumption:** The existing UI components for authentication can be adapted to trigger Convex Auth actions without major redesigns.
*   **Assumption:** The "clean transition" means no historical data needs to be preserved or moved from Supabase.
*   **Question:** Are there any specific performance benchmarks that need to be met post-migration?
*   **Question:** Is there any server-side logic currently implemented in Next.js API routes that directly uses the Supabase client, which will also need migration to Convex actions or HTTP actions?
*   **Assumption:** The existing UI components for displaying chat messages and lists can be adapted to work with data fetched from Convex without major redesigns.
*   **Question:** Are there any specific rate limits or quotas with Convex (free/pro tier) that need to be considered for current usage patterns?

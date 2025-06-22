/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as api_keys from "../api_keys.js";
import type * as auth from "../auth.js";
import type * as chats from "../chats.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as schema_chat from "../schema/chat.js";
import type * as schema_chat_attachment from "../schema/chat_attachment.js";
import type * as schema_feedback from "../schema/feedback.js";
import type * as schema_index from "../schema/index.js";
import type * as schema_logo from "../schema/logo.js";
import type * as schema_message from "../schema/message.js";
import type * as schema_order from "../schema/order.js";
import type * as schema_parts from "../schema/parts.js";
import type * as schema_purchase from "../schema/purchase.js";
import type * as schema_usage_history from "../schema/usage_history.js";
import type * as schema_user from "../schema/user.js";
import type * as schema_user_api_key from "../schema/user_api_key.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  api_keys: typeof api_keys;
  auth: typeof auth;
  chats: typeof chats;
  feedback: typeof feedback;
  files: typeof files;
  http: typeof http;
  messages: typeof messages;
  "schema/chat": typeof schema_chat;
  "schema/chat_attachment": typeof schema_chat_attachment;
  "schema/feedback": typeof schema_feedback;
  "schema/index": typeof schema_index;
  "schema/logo": typeof schema_logo;
  "schema/message": typeof schema_message;
  "schema/order": typeof schema_order;
  "schema/parts": typeof schema_parts;
  "schema/purchase": typeof schema_purchase;
  "schema/usage_history": typeof schema_usage_history;
  "schema/user": typeof schema_user;
  "schema/user_api_key": typeof schema_user_api_key;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

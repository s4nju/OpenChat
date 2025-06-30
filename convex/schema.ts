import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { Chat } from './schema/chat';
import { ChatAttachment } from './schema/chat_attachment';
import { Feedback } from './schema/feedback';
import { Logo } from './schema/logo';
import { Message } from './schema/message';
import { Order } from './schema/order';
import { Purchase } from './schema/purchase';
import { UsageHistory } from './schema/usage_history';
// Import all schema modules
import { User } from './schema/user';
import { UserApiKey } from './schema/user_api_key';

export default defineSchema({
  ...authTables,
  users: defineTable(User).index('email', ['email']),
  chats: defineTable(Chat).index('by_user', ['userId']),
  messages: defineTable(Message)
    .index('by_chat_and_created', ['chatId', 'createdAt'])
    .index('by_user', ['userId'])
    .searchIndex('by_user_content', {
      searchField: 'content',
      filterFields: ['userId', 'chatId'],
    }),
  feedback: defineTable(Feedback).index('by_user', ['userId']),
  chat_attachments: defineTable(ChatAttachment)
    .index('by_chatId', ['chatId'])
    .index('by_userId', ['userId']),
  logos: defineTable(Logo)
    .index('by_order', ['orderid'])
    .index('by_user', ['userid']),
  orders: defineTable(Order).index('by_user', ['userid']),
  purchases: defineTable(Purchase).index('by_user', ['userId']),
  usage_history: defineTable(UsageHistory).index('by_user', ['userId']),
  user_api_keys: defineTable(UserApiKey).index('by_user_provider', [
    'userId',
    'provider',
  ]),
});

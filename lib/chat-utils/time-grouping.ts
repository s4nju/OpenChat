import type { Doc } from '@/convex/_generated/dataModel';

export type TimeGroup =
  | 'Today'
  | 'Yesterday'
  | 'Last 7 Days'
  | 'Last 30 Days'
  | 'Older';

export interface GroupedChats {
  [key: string]: Doc<'chats'>[];
}

/**
 * Get the time group for a given timestamp
 */
export function getTimeGroup(timestamp: number): TimeGroup {
  // Handle invalid timestamps
  if (!timestamp || timestamp <= 0 || !Number.isFinite(timestamp)) {
    return 'Older';
  }

  const now = new Date();
  const chatDate = new Date(timestamp);

  // Check if the date is valid
  if (Number.isNaN(chatDate.getTime())) {
    return 'Older';
  }

  // Handle future dates by treating them as "Today"
  if (chatDate > now) {
    return 'Today';
  }

  // Reset time to start of day for accurate comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const chatStartOfDay = new Date(
    chatDate.getFullYear(),
    chatDate.getMonth(),
    chatDate.getDate()
  );

  if (chatStartOfDay.getTime() === today.getTime()) {
    return 'Today';
  }
  if (chatStartOfDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  if (chatStartOfDay >= sevenDaysAgo) {
    return 'Last 7 Days';
  }
  if (chatStartOfDay >= thirtyDaysAgo) {
    return 'Last 30 Days';
  }
  return 'Older';
}

/**
 * Group chats by time periods and sort within each group
 */
export function groupChatsByTime(chats: Doc<'chats'>[]): GroupedChats {
  // Handle invalid input
  if (!Array.isArray(chats)) {
    return {
      Today: [],
      Yesterday: [],
      'Last 7 Days': [],
      'Last 30 Days': [],
      Older: [],
    };
  }

  const groups: GroupedChats = {
    Today: [],
    Yesterday: [],
    'Last 7 Days': [],
    'Last 30 Days': [],
    Older: [],
  };

  // Group chats by time period
  for (const chat of chats) {
    // Skip invalid chat objects
    if (!chat || typeof chat !== 'object') {
      continue;
    }

    const timestamp =
      chat.updatedAt || chat.createdAt || chat._creationTime || 0;
    const group = getTimeGroup(timestamp);
    groups[group].push(chat);
  }

  // Sort chats within each group by timestamp (descending - newest first)
  for (const groupKey of Object.keys(groups)) {
    groups[groupKey].sort((a, b) => {
      const aTime = a.updatedAt || a.createdAt || a._creationTime || 0;
      const bTime = b.updatedAt || b.createdAt || b._creationTime || 0;
      return bTime - aTime;
    });
  }

  return groups;
}

/**
 * Get ordered group keys (for consistent rendering order)
 */
export function getOrderedGroupKeys(): TimeGroup[] {
  return ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Older'];
}

/**
 * Check if a group has any chats
 */
export function hasChatsInGroup(
  groups: GroupedChats,
  groupKey: TimeGroup
): boolean {
  return groups[groupKey] && groups[groupKey].length > 0;
}

/**
 * Get a human-readable relative time description for a timestamp
 */
export function getRelativeTimeDescription(timestamp: number): string {
  // Handle invalid timestamps
  if (!timestamp || timestamp <= 0 || !Number.isFinite(timestamp)) {
    return 'Unknown';
  }

  const now = new Date();
  const date = new Date(timestamp);

  // Check if the date is valid
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const diffInMs = now.getTime() - date.getTime();

  // Handle future dates
  if (diffInMs < 0) {
    return 'Future';
  }

  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  try {
    return date.toLocaleDateString();
  } catch {
    return 'Unknown date';
  }
}

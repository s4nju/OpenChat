import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { refreshCache } from '@/lib/composio-server';

export async function POST() {
  try {
    const token = await convexAuthNextjsToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get current user
    const user = await fetchQuery(api.users.getCurrentUser, {}, { token });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Trigger background cache refresh
    refreshCache(user._id);

    // Return immediately - refresh happens in background
    return NextResponse.json({
      success: true,
      message: 'Cache refresh initiated',
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to initiate cache refresh' },
      { status: 500 }
    );
  }
}

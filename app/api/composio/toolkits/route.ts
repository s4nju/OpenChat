import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import {
  getToolkitsWithStatus,
  validateEnvironment,
} from '@/lib/composio-server';

export async function GET() {
  try {
    const token = await convexAuthNextjsToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Validate environment
    const envValidation = validateEnvironment();
    if (!envValidation.isValid) {
      return NextResponse.json(
        { error: envValidation.message },
        { status: 500 }
      );
    }

    // Get current user
    const user = await fetchQuery(api.users.getCurrentUser, {}, { token });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get toolkits with connection status
    const toolkits = await getToolkitsWithStatus(user._id);

    return NextResponse.json({ toolkits });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch toolkits' },
      { status: 500 }
    );
  }
}

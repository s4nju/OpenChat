import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { NextResponse } from 'next/server';
import { waitForConnection } from '@/lib/composio-server';

export async function GET(request: Request) {
  try {
    const token = await convexAuthNextjsToken();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionRequestId = searchParams.get('connectionRequestId');

    if (!connectionRequestId) {
      return NextResponse.json(
        { error: 'Connection Request ID is required' },
        { status: 400 }
      );
    }

    try {
      // Wait for connection to complete (with timeout)
      const result = await waitForConnection(
        connectionRequestId,
        60 // 60 seconds timeout
      );

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        // Handle Composio specific errors
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(
        { error: 'Connection not found or failed' },
        { status: 404 }
      );
    }
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    );
  }
}

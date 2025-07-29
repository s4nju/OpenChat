import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { NextResponse } from 'next/server';
import composio from '@/lib/composio-server';

// Type for the connection status response
type ConnectionStatus = {
  id: string;
  status: 'INITIALIZING' | 'INITIATED' | 'ACTIVE' | 'FAILED' | 'EXPIRED';
  authConfig: {
    id: string;
    isComposioManaged: boolean;
    isDisabled: boolean;
  };
  data: Record<string, unknown>;
  params?: Record<string, unknown>;
};

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
      const connection = (await composio.connectedAccounts.waitForConnection(
        connectionRequestId,
        60_000 // 60 seconds timeout
      )) as ConnectionStatus;

      return NextResponse.json({
        connectionId: connection.id,
        isConnected: connection.status === 'ACTIVE',
      });
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

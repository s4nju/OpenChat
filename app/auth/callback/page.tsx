'use client';

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
} from 'convex/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useUser } from '@/app/providers/user-provider';
import { Loader } from '@/components/prompt-kit/loader';
import { api } from '@/convex/_generated/api';
import type { ConnectorType } from '@/lib/composio-utils';
import { getConnectorConfig } from '@/lib/config/tools';

type CallbackStatus = 'checking' | 'success' | 'error';

function AuthenticatedCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [status, setStatus] = useState<CallbackStatus>('checking');

  const saveConnection = useMutation(api.connectors.saveConnection);

  const handleCallback = useCallback(async () => {
    try {
      const connectorType = searchParams.get('type') as ConnectorType;

      if (!connectorType) {
        toast.error('Missing connector type');
        setStatus('error');
        setTimeout(() => {
          router.push('/settings/connectors');
        }, 3000);
        return;
      }

      // Wait for user to be loaded
      if (!user) {
        return;
      }

      // Get connectionRequestId from sessionStorage
      const connectionRequestId = sessionStorage.getItem(
        `composio_connection_${connectorType}`
      );

      if (!connectionRequestId) {
        toast.error('Missing connection request ID');
        setStatus('error');
        setTimeout(() => {
          router.push('/settings/connectors');
        }, 3000);
        return;
      }

      // Clean up sessionStorage
      sessionStorage.removeItem(`composio_connection_${connectorType}`);

      // Wait for connection verification (this will wait for up to 60 seconds)
      const response = await fetch(
        `/api/composio/status?connectionRequestId=${connectionRequestId}`
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        toast.error(`Failed to verify connection: ${errorData.error}`);
        setStatus('error');
        setTimeout(() => {
          router.push('/settings/connectors');
        }, 3000);
        return;
      }

      const data = await response.json();

      if (data.isConnected) {
        // Save to Convex (user is guaranteed to exist in Authenticated component)
        if (user) {
          await saveConnection({
            userId: user._id,
            type: connectorType,
            connectionId: data.connectionId,
          });
        }

        const connectorConfig = getConnectorConfig(connectorType);
        toast.success(`${connectorConfig.displayName} connected successfully`);
        setStatus('success');

        // Redirect back to connectors page after 2 seconds
        setTimeout(() => {
          router.push('/settings/connectors');
        }, 2000);
      } else {
        toast.error('Connection verification failed');
        setStatus('error');
        setTimeout(() => {
          router.push('/settings/connectors');
        }, 3000);
      }
    } catch {
      // Only show failed for genuine errors (like network failures, timeouts, etc.)
      toast.error('Failed to complete connection');
      setStatus('error');

      // Redirect back after 3 seconds
      setTimeout(() => {
        router.push('/settings/connectors');
      }, 3000);
    }
  }, [searchParams, user, saveConnection, router]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {status === 'checking' && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-primary border-b-2" />
            <p>Please wait, we are verifying your connection...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mb-4 text-4xl text-green-500">✓</div>
            <p>Connection successful! Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mb-4 text-4xl text-red-500">✗</div>
            <p>Connection failed. Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <>
      {/* Auth Loading State */}
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader size="lg" variant="dots" />
            <p className="mt-4">Loading...</p>
          </div>
        </div>
      </AuthLoading>

      {/* Unauthenticated State - redirect to home */}
      <Unauthenticated>
        <UnauthenticatedRedirect />
      </Unauthenticated>

      {/* Authenticated State */}
      <Authenticated>
        <AuthenticatedCallback />
      </Authenticated>
    </>
  );
}

function UnauthenticatedRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if not authenticated
    setTimeout(() => {
      router.push('/');
    }, 2000);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl text-red-500">✗</div>
        <p>Authentication required. Redirecting to home...</p>
      </div>
    </div>
  );
}

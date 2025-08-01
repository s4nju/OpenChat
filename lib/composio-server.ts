import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import {
  convertComposioTools,
  validateComposioTools,
} from './composio-tool-adapter';
import { getAuthConfigId } from './composio-utils';
import type { ConnectorType } from './types';

// Server-side Composio client initialization (following official example)
const apiKey = process.env.COMPOSIO_API_KEY;
if (!apiKey) {
  throw new Error('COMPOSIO_API_KEY environment variable is not set');
}

const composio = new Composio({
  apiKey,
  provider: new VercelProvider(),
});

/**
 * Initiate OAuth connection for a user (server-side only)
 */
export const initiateConnection = async (
  userId: string,
  connectorType: ConnectorType,
  callbackUrl?: string
): Promise<{ redirectUrl: string; connectionRequestId: string }> => {
  const authConfigId = getAuthConfigId(connectorType);

  // First, check if user has existing connections for this toolkit and clean them up
  try {
    const existingAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
    });

    // Find any existing connection for this toolkit
    const toolkitSlug = connectorType.toUpperCase();
    const existingConnection = existingAccounts.items.find(
      (account) => account.toolkit.slug.toUpperCase() === toolkitSlug
    );

    if (existingConnection && existingConnection.status !== 'ACTIVE') {
      // Only delete if connection is not active to avoid breaking working connections
      await composio.connectedAccounts.delete(existingConnection.id);
    }
  } catch (_error) {
    // Ignore cleanup errors and proceed with new connection
  }

  const connectionRequest = await composio.connectedAccounts.initiate(
    userId,
    authConfigId,
    callbackUrl ? { callbackUrl } : undefined
  );

  return {
    redirectUrl: connectionRequest.redirectUrl || '',
    connectionRequestId: connectionRequest.id,
  };
};

/**
 * Wait for connection to complete (for polling)
 */
export const waitForConnection = async (
  connectionRequestId: string,
  timeoutSeconds = 300
): Promise<{ connectionId: string; isConnected: boolean }> => {
  const connectedAccount = await composio.connectedAccounts.waitForConnection(
    connectionRequestId,
    timeoutSeconds * 1000 // Convert seconds to milliseconds
  );

  return {
    connectionId: connectedAccount.id,
    isConnected: connectedAccount.status === 'ACTIVE',
  };
};

/**
 * Disconnect an account (server-side only)
 */
export const disconnectAccount = async (
  connectionId: string
): Promise<void> => {
  await composio.connectedAccounts.delete(connectionId);
};

/**
 * List connected accounts for a user (server-side only)
 */
export const listConnectedAccounts = async (userId: string) => {
  const connectedAccounts = await composio.connectedAccounts.list({
    userIds: [userId],
  });

  return connectedAccounts.items;
};

/**
 * Get available toolkits with connection status (server-side only)
 */
export const getToolkitsWithStatus = async (userId: string) => {
  const SUPPORTED_TOOLKITS = [
    'GMAIL',
    'GOOGLECALENDAR',
    'NOTION',
    'GOOGLEDRIVE',
    'GOOGLEDOCS',
    'GOOGLESHEETS',
    'SLACK',
    'LINEAR',
    'GITHUB',
    'TWITTER',
  ];

  // Get connected accounts first
  const connectedAccounts = await listConnectedAccounts(userId);
  const connectedToolkitMap = new Map();

  for (const account of connectedAccounts) {
    connectedToolkitMap.set(account.toolkit.slug.toUpperCase(), account.id);
  }

  // Fetch toolkit data
  const toolkitPromises = SUPPORTED_TOOLKITS.map(async (slug) => {
    const toolkit = await composio.toolkits.get(slug);
    const connectionId = connectedToolkitMap.get(slug.toUpperCase());

    return {
      name: toolkit.name,
      slug: toolkit.slug,
      description: toolkit.meta?.description,
      logo: toolkit.meta?.logo,
      categories: toolkit.meta?.categories,
      isConnected: !!connectionId,
      connectionId: connectionId || undefined,
    };
  });

  return Promise.all(toolkitPromises);
};

/**
 * Get Composio tools for enabled toolkits (for chat integration)
 */
export const getComposioTools = async (
  userId: string,
  toolkitSlugs: string[]
) => {
  if (!toolkitSlugs.length) {
    return {};
  }

  // Create an array of promises for parallel execution
  // Workaround for bug where multiple toolkits in one call only returns last toolkit
  const toolPromises = toolkitSlugs.map((toolkit) =>
    composio.tools
      .get(userId, {
        toolkits: [toolkit], // Single toolkit per request
        limit: 10, // Limit to 10 tools per toolkit
      })
      .catch(() => {
        // Return empty object on error to not break other requests
        return {};
      })
  );

  // Execute all requests in parallel
  const toolsArrays = await Promise.all(toolPromises);

  // Merge all tools into a single object
  const mergedTools: Record<string, unknown> = {};
  for (const tools of toolsArrays) {
    for (const [key, value] of Object.entries(tools)) {
      mergedTools[key] = value;
    }
  }

  // console.log(
  //   'Fetched Composio tools (raw):',
  //   JSON.stringify(
  //     mergedTools,
  //     (key, value) => {
  //       if (typeof value === 'function') {
  //         return `[Function: ${value.name || 'anonymous'}]\n${value.toString()}`;
  //       }
  //       return value;
  //     },
  //     2
  //   )
  // );

  // Validate and convert Composio tools to AI SDK v5 format
  if (validateComposioTools(mergedTools)) {
    const convertedTools = convertComposioTools(mergedTools);
    // console.log(
    //   'Converted tools to AI SDK v5 format:',
    //   Object.keys(convertedTools)
    // );
    return convertedTools;
  }
  // console.warn(
  //   'Some tools are not in expected Composio format, returning as-is'
  // );
  return mergedTools;
};

/**
 * Validate environment setup (server-side only)
 */
export const validateEnvironment = (): {
  isValid: boolean;
  message?: string;
} => {
  if (!process.env.COMPOSIO_API_KEY) {
    return {
      isValid: false,
      message: 'COMPOSIO_API_KEY environment variable is not set',
    };
  }

  return { isValid: true };
};

export default composio;

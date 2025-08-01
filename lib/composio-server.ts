import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import type { JSONSchema7, Tool } from 'ai';
import { jsonSchema } from 'ai';
import {
  getCachedConnectedAccounts,
  getCachedConvertedTools,
  invalidateAllUserCaches,
  setCachedConnectedAccounts,
  setCachedConvertedTools,
} from './composio-cache';
import {
  convertComposioTools,
  validateComposioTools,
} from './composio-tool-adapter';
import { getAuthConfigId } from './composio-utils';
import type { ConnectorType } from './types';

// Interface for cached tool's inputSchema structure
interface CachedInputSchema {
  jsonSchema: JSONSchema7;
}

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
 * Add execute functions back to cached tools
 */
const addExecuteFunctionsToCache = (
  cachedTools: Record<string, Tool>,
  userId: string
): Record<string, Tool> => {
  // Use functional approach with map for better performance
  return Object.fromEntries(
    Object.entries(cachedTools).map(([toolName, tool]) => {
      // Reconstruct the inputSchema using jsonSchema helper
      // The cached tool's inputSchema should have a jsonSchema property
      if (!tool.inputSchema) {
        throw new Error(`Missing inputSchema for tool: ${toolName}`);
      }
      const cachedInputSchema =
        tool.inputSchema as unknown as CachedInputSchema;
      const reconstructedInputSchema = jsonSchema(cachedInputSchema.jsonSchema);

      const reconstructedTool: Tool = {
        ...tool,
        inputSchema: reconstructedInputSchema,
        execute: async (input) => {
          // Call Composio API to execute the tool with correct signature
          const result = await composio.tools.execute(toolName, {
            userId,
            arguments: input,
          });

          return result;
        },
      };

      return [toolName, reconstructedTool];
    })
  );
};

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
  timeoutSeconds = 300,
  userId?: string
): Promise<{ connectionId: string; isConnected: boolean }> => {
  const connectedAccount = await composio.connectedAccounts.waitForConnection(
    connectionRequestId,
    timeoutSeconds * 1000 // Convert seconds to milliseconds
  );

  const isConnected = connectedAccount.status === 'ACTIVE';

  // If connection is successful and we have userId, refresh caches
  if (isConnected && userId) {
    await refreshCache(userId);
  }

  return {
    connectionId: connectedAccount.id,
    isConnected,
  };
};

/**
 * Disconnect an account (server-side only)
 */
export const disconnectAccount = async (
  connectionId: string,
  userId: string
): Promise<void> => {
  await composio.connectedAccounts.delete(connectionId);

  // Refresh caches since connected accounts have changed
  await refreshCache(userId);
};

/**
 * List connected accounts for a user (server-side only)
 * Returns secure cached data when available, full API data when not cached
 */
export const listConnectedAccounts = async (userId: string) => {
  // Check cache first (returns secure data without OAuth tokens)
  const cachedAccounts = await getCachedConnectedAccounts(userId);
  if (cachedAccounts) {
    return cachedAccounts;
  }

  // Fetch from Composio API if not cached (full data with sensitive tokens)
  const connectedAccounts = await composio.connectedAccounts.list({
    userIds: [userId],
  });

  // Cache the results (sensitive data is automatically stripped by setCachedConnectedAccounts)
  await setCachedConnectedAccounts(userId, connectedAccounts.items);

  // Return the full API response for this call (caller needs to handle sensitive data appropriately)
  return connectedAccounts.items;
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

  // Check if we have cached converted tools for this exact combination
  const cachedConverted = await getCachedConvertedTools(userId, toolkitSlugs);
  // console.log(cachedConverted);
  if (cachedConverted) {
    // Add execute functions back to cached tools
    const toolsWithExecute = addExecuteFunctionsToCache(
      cachedConverted,
      userId
    );
    return toolsWithExecute;
  }

  // Fetch raw tools from Composio API (can't cache due to functions)
  const toolPromises = toolkitSlugs.map(async (toolkit) => {
    try {
      const tools = await composio.tools.get(userId, {
        toolkits: [toolkit], // Single toolkit per request
        limit: 10, // Limit to 10 tools per toolkit
      });
      return tools;
    } catch (_error) {
      // console.error(`Failed to fetch tools for toolkit ${toolkit}:`, error);
      // Return empty object on error to not break other requests
      return {};
    }
  });

  // Execute all requests in parallel
  const toolsArrays = await Promise.all(toolPromises);

  // Merge all tools into a single object
  const mergedTools: Record<string, unknown> = {};
  for (const tools of toolsArrays) {
    for (const [key, value] of Object.entries(tools)) {
      mergedTools[key] = value;
    }
  }

  // Validate and convert Composio tools to AI SDK v5 format
  let finalTools: Record<string, unknown>;
  if (validateComposioTools(mergedTools)) {
    const convertedTools = convertComposioTools(mergedTools);
    finalTools = convertedTools;
  } else {
    // console.warn('Some tools are not in expected Composio format, returning as-is');
    finalTools = mergedTools;
  }

  // console.log('Final tools:', finalTools);
  // Cache the converted tools for future requests
  await setCachedConvertedTools(
    userId,
    toolkitSlugs,
    finalTools as Record<string, Tool>
  );

  return finalTools;
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

/**
 * Refresh cache for a user
 * Returns a Promise to ensure completion in serverless environments
 */
export const refreshCache = async (userId: string): Promise<void> => {
  try {
    // First, invalidate all existing cache entries for this user
    // This ensures no stale data remains
    await invalidateAllUserCaches(userId);

    // Fetch fresh data from Composio API
    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
    });

    // Get active toolkits for cache refresh
    const activeToolkits = connectedAccounts.items
      .filter((account) => account.status === 'ACTIVE')
      .map((account) => account.toolkit.slug.toUpperCase());

    // Only cache if there are active accounts, otherwise don't cache anything
    if (activeToolkits.length > 0) {
      // Update the connected accounts cache with fresh data
      await setCachedConnectedAccounts(userId, connectedAccounts.items);

      // Refresh tools cache - getComposioTools will cache the results
      await getComposioTools(userId, activeToolkits);
    }
  } catch {
    // Silently handle error - cache refresh is optional
    // In production, this could be sent to an error tracking service
  }
};

export default composio;

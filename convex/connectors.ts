import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';

// Type for connector types
const CONNECTOR_TYPES = v.union(
  v.literal('gmail'),
  v.literal('googlecalendar'),
  v.literal('googledrive'),
  v.literal('notion')
);

/**
 * List all connectors for a user
 */
export const listUserConnectors = query({
  args: {
    userId: v.id('users'),
  },
  returns: v.array(
    v.object({
      _id: v.id('connectors'),
      _creationTime: v.number(),
      userId: v.id('users'),
      type: CONNECTOR_TYPES,
      connectionId: v.string(),
      isConnected: v.boolean(),
      displayName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const connectors = await ctx.db
      .query('connectors')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return connectors;
  },
});

/**
 * Get a specific connector by user and type
 */
export const getConnectorByType = query({
  args: {
    userId: v.id('users'),
    type: CONNECTOR_TYPES,
  },
  returns: v.union(
    v.object({
      _id: v.id('connectors'),
      _creationTime: v.number(),
      userId: v.id('users'),
      type: CONNECTOR_TYPES,
      connectionId: v.string(),
      isConnected: v.boolean(),
      displayName: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const connector = await ctx.db
      .query('connectors')
      .withIndex('by_user_and_type', (q) =>
        q.eq('userId', args.userId).eq('type', args.type)
      )
      .unique();

    return connector ?? null;
  },
});

/**
 * Save a new connection
 */
export const saveConnection = mutation({
  args: {
    userId: v.id('users'),
    type: CONNECTOR_TYPES,
    connectionId: v.string(),
    displayName: v.optional(v.string()),
  },
  returns: v.id('connectors'),
  handler: async (ctx, args) => {
    // Check if connector already exists
    const existingConnector = await ctx.db
      .query('connectors')
      .withIndex('by_user_and_type', (q) =>
        q.eq('userId', args.userId).eq('type', args.type)
      )
      .unique();

    if (existingConnector) {
      // Update existing connector
      await ctx.db.patch(existingConnector._id, {
        connectionId: args.connectionId,
        isConnected: true,
        displayName: args.displayName,
      });
      return existingConnector._id;
    }

    // Create new connector
    const connectorId = await ctx.db.insert('connectors', {
      userId: args.userId,
      type: args.type,
      connectionId: args.connectionId,
      isConnected: true,
      displayName: args.displayName,
    });

    return connectorId;
  },
});

/**
 * Remove a connection
 */
export const removeConnection = mutation({
  args: {
    userId: v.id('users'),
    type: CONNECTOR_TYPES,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connector = await ctx.db
      .query('connectors')
      .withIndex('by_user_and_type', (q) =>
        q.eq('userId', args.userId).eq('type', args.type)
      )
      .unique();

    if (connector) {
      await ctx.db.delete(connector._id);
    }

    return null;
  },
});

/**
 * Update connection status
 */
export const updateConnectionStatus = mutation({
  args: {
    userId: v.id('users'),
    type: CONNECTOR_TYPES,
    isConnected: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connector = await ctx.db
      .query('connectors')
      .withIndex('by_user_and_type', (q) =>
        q.eq('userId', args.userId).eq('type', args.type)
      )
      .unique();

    if (connector) {
      await ctx.db.patch(connector._id, {
        isConnected: args.isConnected,
      });
    }

    return null;
  },
});

/**
 * Internal function to sync connection status with Composio
 */
export const syncConnectionStatus = internalMutation({
  args: {
    connectorId: v.id('connectors'),
    isConnected: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectorId, {
      isConnected: args.isConnected,
    });

    return null;
  },
});

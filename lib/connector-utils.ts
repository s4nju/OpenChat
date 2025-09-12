import type { ConnectorType } from './types';

// Supported connector types - keep in sync with lib/config/tools.ts
export const SUPPORTED_CONNECTORS: ConnectorType[] = [
  'gmail',
  'googlecalendar',
  'googledrive',
  'notion',
  'googledocs',
  'googlesheets',
  'slack',
  'linear',
  'github',
  'twitter',
];

export type ConnectorStatusLists = {
  enabled: string[];
  disabled: string[];
  notConnected: string[];
};

export type Connector = {
  type: ConnectorType;
  isConnected: boolean;
  enabled?: boolean;
};

/**
 * Calculate connector status lists from user's connector data
 * This is the authoritative server-side logic for determining tool availability
 */
export function calculateConnectorStatus(
  connectors: Connector[]
): ConnectorStatusLists {
  const enabledSlugs = connectors
    .filter((connector) => connector.isConnected && connector.enabled !== false)
    .map((connector) => connector.type.toUpperCase());

  const disabledSlugs = connectors
    .filter((connector) => connector.isConnected && connector.enabled === false)
    .map((connector) => connector.type.toUpperCase());

  // Only consider connectors with isConnected === true as connected
  const connectedTypes = new Set(
    connectors.filter((c) => c.isConnected).map((c) => c.type)
  );

  const notConnectedSlugs = SUPPORTED_CONNECTORS.filter(
    (type) => !connectedTypes.has(type)
  ).map((t) => t.toUpperCase());

  return {
    enabled: enabledSlugs,
    disabled: disabledSlugs,
    notConnected: notConnectedSlugs,
  };
}

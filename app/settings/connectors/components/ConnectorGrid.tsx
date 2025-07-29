'use client';

import type { Id } from '@/convex/_generated/dataModel';
import type { ConnectorType } from '@/lib/composio-utils';
import { SUPPORTED_CONNECTORS } from '@/lib/config/tools';
import { ConnectorCard } from './ConnectorCard';

interface ConnectorData {
  _id?: Id<'connectors'>;
  type: ConnectorType;
  isConnected: boolean;
  displayName?: string;
  connectionId?: string;
}

interface ConnectorGridProps {
  connectors: ConnectorData[];
  onConnect: (type: ConnectorType) => void;
  onDisconnect: (type: ConnectorType) => Promise<void>;
  connectingStates: Record<ConnectorType, boolean>;
}

export function ConnectorGrid({
  connectors,
  onConnect,
  onDisconnect,
  connectingStates,
}: ConnectorGridProps) {
  // Create a map of existing connectors for quick lookup
  const connectorMap = new Map(
    connectors.map((connector) => [connector.type, connector])
  );

  // Build complete list with defaults for missing connectors
  const allConnectors: ConnectorData[] = SUPPORTED_CONNECTORS.map(
    (type: ConnectorType) => {
      const existing = connectorMap.get(type);
      return (
        existing ?? {
          type,
          isConnected: false,
        }
      );
    }
  );

  return (
    <section aria-labelledby="connectors-heading">
      <h2 className="sr-only" id="connectors-heading">
        Available Connectors
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {allConnectors.map((connector) => (
          <ConnectorCard
            connector={connector}
            isConnecting={connectingStates[connector.type]}
            key={connector.type}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        ))}
      </div>
    </section>
  );
}

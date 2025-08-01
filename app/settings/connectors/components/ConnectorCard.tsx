'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ConnectorIcon } from '@/app/components/common/connector-icon';
import { Button } from '@/components/ui/button';
import type { Id } from '@/convex/_generated/dataModel';
import { getConnectorConfig } from '@/lib/config/tools';
import type { ConnectorType } from '@/lib/types';

interface ConnectorData {
  _id?: Id<'connectors'>;
  type: ConnectorType;
  isConnected: boolean;
  displayName?: string;
  connectionId?: string;
}

interface ConnectorCardProps {
  connector: ConnectorData;
  onConnect: (type: ConnectorType) => void;
  onDisconnect: (type: ConnectorType) => Promise<void>;
  isConnecting: boolean;
}

export function ConnectorCard({
  connector,
  onConnect,
  onDisconnect,
  isConnecting,
}: ConnectorCardProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = () => {
    onConnect(connector.type);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect(connector.type);
    } catch {
      const config = getConnectorConfig(connector.type);
      toast.error(`Failed to disconnect ${config.displayName}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const config = getConnectorConfig(connector.type);

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <ConnectorIcon className="size-5" connector={config} />
            {config.displayName}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm">{config.description}</p>
        {connector.displayName && (
          <p className="text-muted-foreground text-sm">
            Connected as: <strong>{connector.displayName}</strong>
          </p>
        )}
      </div>

      <div className="flex justify-end">
        {connector.isConnected ? (
          <Button
            disabled={isDisconnecting}
            onClick={handleDisconnect}
            size="sm"
            type="button"
            variant="destructive"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        ) : (
          <Button
            disabled={isConnecting}
            onClick={handleConnect}
            size="sm"
            type="button"
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );
}

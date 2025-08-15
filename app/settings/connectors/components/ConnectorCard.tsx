'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ConnectorIcon } from '@/app/components/common/connector-icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Id } from '@/convex/_generated/dataModel';
import { getConnectorConfig } from '@/lib/config/tools';
import type { ConnectorType } from '@/lib/types';

type ConnectorData = {
  _id?: Id<'connectors'>;
  type: ConnectorType;
  isConnected: boolean;
  displayName?: string;
  connectionId?: string;
};

type ConnectorCardProps = {
  connector: ConnectorData;
  onConnect: (type: ConnectorType) => void;
  onDisconnect: (type: ConnectorType) => Promise<void>;
  isConnecting: boolean;
};

export function ConnectorCard({
  connector,
  onConnect,
  onDisconnect,
  isConnecting,
}: ConnectorCardProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const handleConnect = () => {
    onConnect(connector.type);
  };

  const handleDisconnect = () => {
    setShowDisconnectDialog(true);
  };

  const confirmDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect(connector.type);
    } catch {
      const config = getConnectorConfig(connector.type);
      toast.error(`Failed to disconnect ${config.displayName}`);
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  const config = getConnectorConfig(connector.type);

  return (
    <div className="flex h-full min-h-[140px] flex-col rounded-lg border p-4">
      <div className="flex flex-1 flex-col space-y-2">
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

      <div className="flex justify-end pt-4">
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

      {/* Disconnect confirmation dialog */}
      <Dialog
        onOpenChange={setShowDisconnectDialog}
        open={showDisconnectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {config.displayName}?</DialogTitle>
            <DialogDescription>
              This will disconnect your {config.displayName} account. You can
              reconnect it at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDisconnectDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={confirmDisconnect} variant="destructive">
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

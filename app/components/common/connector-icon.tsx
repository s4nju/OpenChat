'use client';

import { useTheme } from '@/hooks/use-theme';
import type { ConnectorConfig } from '@/lib/config/tools';

type ConnectorIconProps = {
  connector: ConnectorConfig;
  className?: string;
};

export function ConnectorIcon({ connector, className }: ConnectorIconProps) {
  const { resolvedTheme } = useTheme();
  const Icon =
    resolvedTheme === 'light' && connector.icon_light
      ? connector.icon_light
      : connector.icon;
  return <Icon className={className} />;
}

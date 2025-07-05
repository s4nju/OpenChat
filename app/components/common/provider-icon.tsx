'use client';

import { useTheme } from 'next-themes';
import type { Provider } from '@/lib/config';

type ProviderIconProps = {
  provider: Provider;
  className?: string;
};

export function ProviderIcon({ provider, className }: ProviderIconProps) {
  const { resolvedTheme } = useTheme();
  const Icon =
    resolvedTheme === 'light' && provider.icon_light
      ? provider.icon_light
      : provider.icon;
  return <Icon className={className} />;
}

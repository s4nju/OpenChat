import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

// Extract hostname from CONVEX_URL for image configuration
const getConvexHostname = (): string | null => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl) {
    try {
      return new URL(convexUrl).hostname;
    } catch {
      // Silent fail - return null if URL parsing fails
    }
  }
  return null;
};

const nextConfig: NextConfig = {
  // Disable React Strict Mode to prevent double-invoking effects
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react', '@lobehub/icons'],
    reactCompiler: true,
    // nodeMiddleware: true,
  },
  eslint: {
    // @todo: remove before going live
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      // Add Convex hostname dynamically
      ...(() => {
        const convexHostname = getConvexHostname();
        return convexHostname
          ? [
              {
                protocol: 'https' as const,
                hostname: convexHostname,
              },
            ]
          : [];
      })(),
    ],
  },
  // biome-ignore lint/suspicious/useAwait: Next.js API requires async rewrites function
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://eu.i.posthog.com/decide',
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);

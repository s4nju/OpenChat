import type { NextConfig } from "next"
import withBundleAnalyzer from "@next/bundle-analyzer"

// Extract hostname from CONVEX_URL for image configuration
const getConvexHostname = () => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (convexUrl) {
    try {
      return new URL(convexUrl).hostname
    } catch (error) {
      console.warn('Failed to parse NEXT_PUBLIC_CONVEX_URL:', error)
    }
  }
  return null
}

const nextConfig: NextConfig = {
  // Disable React Strict Mode to prevent double-invoking effects
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "@lobehub/icons"],
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
      ...(getConvexHostname() ? [{
        protocol: 'https' as const,
        hostname: getConvexHostname()!,
      }] : []),
    ],
  },
}

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig)
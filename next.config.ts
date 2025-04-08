import type { NextConfig } from "next"
import withBundleAnalyzer from '@next/bundle-analyzer'

// Create a bundle analyzer wrapper
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // @todo: remove before going live
    ignoreDuringBuilds: true,
  },
  
  // Optimize imports for @phosphor-icons/react to reduce bundle size
  // This ensures only the icons you actually use are included in the bundle
  experimental: {
  optimizePackageImports: ["@phosphor-icons/react"],
}
}

// Export the config with bundle analyzer applied
export default bundleAnalyzer(nextConfig)

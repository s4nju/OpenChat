/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production configuration
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
    unoptimized: false,
  },

  // Security headers are now handled in middleware.ts

  // Build optimizations
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
};

export default nextConfig;

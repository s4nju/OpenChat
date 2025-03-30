/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/chat',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
    turboPack: true,
  },
}

export default nextConfig

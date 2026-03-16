import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude bot folder from build traces (separate Bun app)
  outputFileTracingExcludes: {
    '*': ['./bot/**'],
  },
  // pg driver uses Node.js built-ins — keep it server-side only
  serverExternalPackages: ['pg', 'pg-connection-string', '@prisma/adapter-pg'],
  // Serwist uses webpack internally; suppress Turbopack warning
  turbopack: {},
  // Stub Node.js built-ins for client bundle (pg driver leaks via scoring.ts import chain)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
      }
    }
    return config
  },
}

export default withSerwist(nextConfig)

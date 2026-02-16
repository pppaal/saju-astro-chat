// Sentry error monitoring - re-enabled
import { withSentryConfig } from '@sentry/nextjs'
// Bundle Analyzer - enable with ANALYZE=true npm run build
import bundleAnalyzer from '@next/bundle-analyzer'
// PWA support - offline capability and app-like experience
import withPWAInit from '@ducanh2912/next-pwa'
// 파일 경로: next.config.ts

import path from 'path'
import type { Configuration } from 'webpack'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: false, // Prevent automatic page refresh on SW update
  reloadOnOnline: false, // Disable auto-reload which can cause refresh loops
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false, // Reduce aggressive caching that may conflict with new deployments
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // Allow ~3MB bundles in precache
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-images',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-resources',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      {
        urlPattern: /^https:\/\/api\.destinypal\.com\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 5 * 60, // 5 minutes
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이 옵션은 swisseph가 node_modules를 참조할 수 있도록 도와줍니다.
  outputFileTracingRoot: path.join(__dirname),
  // Performance optimizations
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: false,
  },
  // Note: ESLint config removed - no longer supported in next.config.ts for Next.js 16+
  // ESLint is enforced separately via CI (see .github/workflows/ci.yml)

  // Native Node.js modules that should not be bundled
  // This is required for Turbopack compatibility with native modules like swisseph
  serverExternalPackages: ['swisseph'],

  // Experimental performance features
  experimental: {
    optimizeCss: true, // CSS optimization
    scrollRestoration: true, // Remember scroll position
    optimizePackageImports: [
      'framer-motion',
      'chart.js',
      'recharts',
      '@vercel/speed-insights',
      'react-markdown',
      'remark-gfm',
      'zod',
    ], // Tree-shake large packages
  },

  // Empty turbopack config to silence Next.js 16 warning
  turbopack: {},

  // Security and cache headers
  async headers() {
    // Security headers for all routes
    // NOTE: CSP is handled exclusively by middleware.ts (nonce-based).
    // Do NOT add CSP headers here to avoid duplication and conflicts.
    const isProd = process.env.NODE_ENV === 'production'

    const securityHeaders = [
      // Prevent MIME type sniffing
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Prevent clickjacking attacks
      { key: 'X-Frame-Options', value: 'DENY' },
      // Legacy XSS protection (modern browsers use CSP)
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      // Control referrer information
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Restrict browser features
      {
        key: 'Permissions-Policy',
        value:
          'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), autoplay=(self)',
      },
      // Prevent DNS prefetch attacks
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      // Disable content type guessing
      { key: 'X-Download-Options', value: 'noopen' },
      // Prevent Adobe Flash and PDF from accessing content
      { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
      // HSTS - enforce HTTPS (production only)
      ...(isProd
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains; preload',
            },
          ]
        : []),
    ]

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:all*(js|css)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:all*(woff|woff2|ttf|otf)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // API routes with short cache
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ]
  },

  async redirects() {
    return [
      {
        source: '/blog/numerology-life-path-numbers-explained',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blog/numerology-:slug',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.destinypal.com' }],
        destination: 'https://destinypal.com/:path*',
        permanent: true,
      },
    ]
  },

  // 이미지 최적화 설정
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year for optimized images
  },

  webpack: (config: Configuration, { isServer }: { isServer: boolean }) => {
    // swisseph는 서버와 클라이언트 빌드 모두에서 외부 모듈로 처리해야 합니다.
    // 서버: 번들링에서 제외하고 런타임에 Node.js가 require() 하도록 합니다.
    // 클라이언트: 번들링에서 제외하여, 클라이언트 코드에서 실수로 import하는 것을 막습니다.

    // 기존 externals 설정을 안전하게 확장합니다.
    const externals = config.externals || []

    // Client-side: exclude Node.js-only modules from browser bundle
    if (!isServer) {
      const clientExternals = ['swisseph']
      if (Array.isArray(externals)) {
        config.externals = [...externals, ...clientExternals]
      } else {
        config.externals = [externals, ...clientExternals]
      }
    } else {
      // Server-side: only exclude swisseph
      if (Array.isArray(externals)) {
        config.externals = [...externals, 'swisseph']
      } else {
        config.externals = [externals, 'swisseph']
      }
    }

    // Performance optimizations - code splitting and caching
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic', // Better long-term caching
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Separate large data files
          iching: {
            test: /[\\/]src[\\/]lib[\\/]iChing[\\/]/,
            name: 'iching-lib',
            priority: 10,
          },
          tarot: {
            test: /[\\/]src[\\/]lib[\\/]Tarot[\\/]/,
            name: 'tarot-lib',
            priority: 10,
          },
          saju: {
            test: /[\\/]src[\\/]lib[\\/]Saju[\\/]/,
            name: 'saju-lib',
            priority: 10,
          },
          // Vendor libraries
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react-vendor',
            priority: 20,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 5,
          },
        },
      },
    }

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@opentelemetry\/instrumentation/ },
      { message: /Critical dependency: the request of a dependency is an expression/ },
    ]
    return config
  },
}

// Apply multiple wrappers: PWA + Bundle Analyzer + Sentry
export default withPWA(
  withBundleAnalyzer(
    withSentryConfig(nextConfig, {
      org: 'destinypal',
      project: 'javascript-nextjs',
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
      },
      webpack: {
        // Updated per Sentry deprecation: use webpack.automaticVercelMonitors
        automaticVercelMonitors: true,
      },
    })
  )
)

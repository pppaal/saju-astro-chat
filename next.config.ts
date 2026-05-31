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
  // SECURITY: Disabled to prevent caching of authenticated page shells in
  // the service-worker. With this on, `@ducanh2912/next-pwa` caches HTML
  // documents visited via client-side navigation; on a shared device a
  // signed-out user's session-aware page (header with previous user's
  // name, balances, etc.) could be served to the next user. The minor
  // perf cost is acceptable for the security win.
  cacheOnFrontEndNav: false,
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
        // SECURITY: Only cache same-origin static assets (anything under
        // `/`), not arbitrary remote image URLs. Previously this regex
        // matched any image extension, including
        // `firebasestorage.googleapis.com` and `*.public.blob.vercel-storage.com`
        // URLs that serve per-user profile photos. Without a per-user
        // cache key those entries leaked across sign-outs on a shared
        // browser. Build artifacts and `/public/*` images live on the
        // CDN and are already covered by HTTP `Cache-Control: max-age`
        // headers (see headers() below), so SW caching is redundant.
        urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
          sameOrigin && /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i.test(url.pathname),
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
        // Same-origin JS/CSS only. Hashed build artifacts are safe to
        // cache aggressively; cross-origin scripts are not.
        urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
          sameOrigin && /\.(?:js|css)$/i.test(url.pathname),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-resources',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      // SECURITY: We intentionally do NOT runtime-cache API responses in
      // the service worker. The previous `api.destinypal.com/*`
      // NetworkFirst entry had no per-user cache key, so on a shared
      // browser the next user could be served the previous user's
      // `/api/me/*`, credits, chat history, or profile data when the
      // network was slow or offline. API routes already send
      // `Cache-Control: no-store` (see headers() below); if we ever
      // need offline-read of static content from the API, it must be
      // implemented with a per-user cache key as a deliberate feature.
    ],
  },
})

const isVercelBuild = process.env.VERCEL === '1' || process.env.VERCEL === 'true'
const resolvedDistDir = process.env.NEXT_DIST_DIR || (isVercelBuild ? '.next' : 'tmp/.next')

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: resolvedDistDir,
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

  // Ensure native addon and ephemeris files are traced into serverless outputs.
  // Without this, routes that depend on swisseph can fail at runtime on deploy.
  outputFileTracingIncludes: {
    '/app/api/astrology/**': [
      './node_modules/swisseph/build/Release/**/*.node',
      './public/ephe/**/*',
    ],
    '/app/api/calendar': ['./node_modules/swisseph/build/Release/**/*.node', './public/ephe/**/*'],
    '/app/api/past-life': ['./node_modules/swisseph/build/Release/**/*.node', './public/ephe/**/*'],
    '/app/api/precompute-chart': [
      './node_modules/swisseph/build/Release/**/*.node',
      './public/ephe/**/*',
    ],
    // Counselor routes pull astrology in too: compat through
    // buildAutoAstroContext, destiny realtime through runFortuneWithRaw,
    // tarot through cross-mode + couple-reading natal cross. These were
    // missing so the production serverless bundle couldn't find swisseph
    // at runtime and the LLM ended up with empty astro data — user
    // noticed because answers stopped citing astrology terms.
    '/app/api/compatibility/**': [
      './node_modules/swisseph/build/Release/**/*.node',
      './public/ephe/**/*',
    ],
    '/app/api/counselor/**': [
      './node_modules/swisseph/build/Release/**/*.node',
      './public/ephe/**/*',
    ],
    '/app/api/tarot/**': ['./node_modules/swisseph/build/Release/**/*.node', './public/ephe/**/*'],
  },
  outputFileTracingExcludes: {
    '/app/api/**': [
      './public/images/**/*',
      './artifacts/**/*',
      './qa-dumps/**/*',
      './reports/**/*',
      './tmp/**/*',
      './htmlcov/**/*',
      './playwright-report/**/*',
      './package-lock.json',
      './tmp/tsconfig.tsbuildinfo',
    ],
  },

  // Experimental performance features
  experimental: {
    optimizeCss: false, // Avoid critters/CSS post-processing failures in local and CI environments
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

  // Turbopack: alias swisseph to a browser stub on the client bundle.
  // serverExternalPackages + the webpack() externals above handle server &
  // legacy-webpack builds, but Turbopack ignores the webpack() function and
  // still statically traces require('swisseph') in ephe.ts into client
  // graphs (FreeReport → lifeReport builder → extraPoints → ephe). The
  // `browser` condition swaps in a Proxy stub for client targets only;
  // server builds keep the real native binding via serverExternalPackages.
  turbopack: {
    resolveAlias: {
      swisseph: {
        browser: './src/lib/astrology/foundation/swisseph.client-stub.ts',
      },
    },
  },

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

    const marketingCacheHeaders = [
      { key: 'Cache-Control', value: 'public, s-maxage=900, stale-while-revalidate=86400' },
    ]

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Cache anonymous marketing pages at the CDN edge
        source: '/',
        headers: marketingCacheHeaders,
      },
      {
        source: '/pricing',
        headers: marketingCacheHeaders,
      },
      {
        source: '/blog',
        headers: marketingCacheHeaders,
      },
      {
        source: '/blog/:slug*',
        headers: marketingCacheHeaders,
      },
      {
        source: '/about',
        headers: marketingCacheHeaders,
      },
      {
        source: '/contact',
        headers: marketingCacheHeaders,
      },
      {
        source: '/faq',
        headers: marketingCacheHeaders,
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
        source: '/ai-report',
        destination: '/premium-reports',
        permanent: false,
      },
      {
        source: '/premium-reports/result',
        destination: '/premium-reports',
        permanent: false,
      },
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
      // 옛 라우트 /destiny-map/* → 현재 /destiny-counselor 로 통합.
      // SEO 자산 + 외부 링크 보호 위해 영구 redirect. 옛 /destiny-counselor 도
      // 다른 path 였다가 (PR #1026) 다시 본래 라우트로 복원 (자동 통과).
      {
        source: '/destiny-map',
        destination: '/destiny-counselor',
        permanent: true,
      },
      {
        source: '/destiny-map/counselor',
        destination: '/destiny-counselor',
        permanent: true,
      },
      {
        source: '/destiny-map/:path*',
        destination: '/destiny-counselor',
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
      {
        // Vercel Blob — 프로필 사진 (스토어별 서브도메인이라 wildcard).
        // 예: <store-id>.public.blob.vercel-storage.com
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
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
        minSize: 30 * 1024,
        maxInitialRequests: 18,
        maxAsyncRequests: 30,
        cacheGroups: {
          // Separate large data files
          iching: {
            test: /[\\/]src[\\/]lib[\\/]iChing[\\/]/,
            name: 'iching-lib',
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
          },
          tarot: {
            test: /[\\/]src[\\/]lib[\\/]Tarot[\\/]/,
            name: 'tarot-lib',
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
          },
          saju: {
            test: /[\\/]src[\\/]lib[\\/]Saju[\\/]/,
            name: 'saju-lib',
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
          },
          // Vendor libraries
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react-vendor',
            priority: 20,
            reuseExistingChunk: true,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 5,
            minChunks: 2,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 1,
            reuseExistingChunk: true,
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

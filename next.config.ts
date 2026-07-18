// Sentry error monitoring - re-enabled
import { withSentryConfig } from '@sentry/nextjs'
// Bundle Analyzer - enable with ANALYZE=true npm run build
import bundleAnalyzer from '@next/bundle-analyzer'
// 파일 경로: next.config.ts
//
// PWA(오프라인/푸시): 예전엔 @ducanh2912/next-pwa(withPWA)로 sw.js 를 생성했으나,
// 이 프로젝트의 `next build` 는 Turbopack 으로 돌고 next-pwa 는 webpack 플러그인
// 이라 아무 sw.js 도 생성되지 않았다(설정만 있고 무효). 실제 오프라인 폴백·웹
// 푸시는 정적 통합 SW(public/push-sw.js)를 ServiceWorkerStabilityGuard 가 등록해
// 처리한다. 오도를 유발하던 죽은 withPWA 래퍼/설정은 제거했다.

import path from 'path'
import type { Configuration } from 'webpack'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
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
  serverExternalPackages: ['swisseph', '@ffmpeg-installer/ffmpeg'],

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
    // PAGE routes (RSC, force-dynamic) that build Swiss Ephemeris *inline* at
    // request time — not via an API route. On a cache miss (anonymous sample
    // person, or any first-time/uncached birthKey) the server component calls
    // buildNatalContext directly, so these serverless bundles need the native
    // addon + ephe data too. Missing → the natal build throws and /calendar
    // shows its error boundary ("운흐름을 불러오지 못했어요") — which looked like a
    // "logged-out doesn't work" bug, because logged-in returning users read
    // pre-built cells from the DB cache and never hit the ephemeris path.
    '/app/calendar': ['./node_modules/swisseph/build/Release/**/*.node', './public/ephe/**/*'],
    '/app/calendar/preview': [
      './node_modules/swisseph/build/Release/**/*.node',
      './public/ephe/**/*',
    ],
    '/app/destiny': ['./node_modules/swisseph/build/Release/**/*.node', './public/ephe/**/*'],
    '/app/(main)/integrated-report': [
      './node_modules/swisseph/build/Release/**/*.node',
      './public/ephe/**/*',
    ],
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
    // 라우터 클라이언트 네비게이션을 document.startViewTransition 으로 감싼다.
    // 메인 홈 입력창 ↔ 운명 상담사 입력창에 동일한 view-transition-name
    // ("destiny-input") 을 줘, 전환 시 입력창이 하나로 이어져(morph) 보이게 한다.
    // (수동 startViewTransition 은 SPA 에서 새 라우트 렌더 완료를 못 기다려
    //  모핑이 깨지므로 Next 내장 통합이 필요하다.)
    viewTransition: true,
    optimizePackageImports: [
      'framer-motion',
      'chart.js',
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
    // NOTE: CSP is handled exclusively by proxy.ts (nonce-based).
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
      // 제품 명칭 통일: 캘린더(운흐름) 라우트의 canonical 을 /calendar 로 확정.
      // 옛 canonical /destinypal (5-tier 뷰)·외부 링크·북마크가 끊기지 않도록
      // edge-level 308(permanent)로 /calendar 에 흡수. (이전엔 반대 방향이었음.)
      {
        source: '/destinypal',
        destination: '/calendar',
        permanent: true,
      },
      {
        source: '/destinypal/:path*',
        destination: '/calendar/:path*',
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

// Apply wrappers: Bundle Analyzer + Sentry. (PWA 는 withPWA 대신 정적
// public/push-sw.js + ServiceWorkerStabilityGuard 로 처리 — 상단 주석 참조.)
export default withBundleAnalyzer(
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

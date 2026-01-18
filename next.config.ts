// Sentry error monitoring - re-enabled
import {withSentryConfig} from '@sentry/nextjs';
// 파일 경로: next.config.ts

import path from 'path';
import type { Configuration } from 'webpack';

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
    ], // Tree-shake large packages
  },

  // Empty turbopack config to silence Next.js 16 warning
  turbopack: {},

  // Security and cache headers
  async headers() {
    // Security headers for all routes
    const isProd = process.env.NODE_ENV === 'production';

    // Build connect-src dynamically to avoid HTTP in production
    const connectSrc = [
      "'self'",
      "https://api.destinypal.com",
      "https://*.sentry.io",
      "https://www.google-analytics.com",
      "https://www.clarity.ms",
      "wss:",
    ];
    const aiBackend = process.env.AI_BACKEND_URL;
    if (aiBackend && aiBackend.startsWith("https://")) {
      connectSrc.push(aiBackend);
    }
    if (!isProd) {
      connectSrc.push("http://localhost:5000", "http://127.0.0.1:5000");
    }

    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
      // HSTS - enforce HTTPS (enable after confirming HTTPS works in production)
      ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
      // CSP is now handled by middleware.ts with nonce-based security
      // This provides better protection against XSS attacks
    ];

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*(js|css)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*(woff|woff2|ttf|otf)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // API routes with short cache
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.destinypal.com" }],
        destination: "https://destinypal.com/:path*",
        permanent: true,
      },
    ];
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
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  webpack: (
    config: Configuration,
    { isServer }: { isServer: boolean }
  ) => {
    // swisseph는 서버와 클라이언트 빌드 모두에서 외부 모듈로 처리해야 합니다.
    // 서버: 번들링에서 제외하고 런타임에 Node.js가 require() 하도록 합니다.
    // 클라이언트: 번들링에서 제외하여, 클라이언트 코드에서 실수로 import하는 것을 막습니다.

    // 기존 externals 설정을 안전하게 확장합니다.
    const externals = config.externals || [];

    // Client-side: exclude winston and other Node.js-only modules
    if (!isServer) {
      const clientExternals = ['winston', 'swisseph'];
      if (Array.isArray(externals)) {
        config.externals = [...externals, ...clientExternals];
      } else {
        config.externals = [externals, ...clientExternals];
      }
    } else {
      // Server-side: only exclude swisseph
      if (Array.isArray(externals)) {
        config.externals = [...externals, 'swisseph'];
      } else {
        config.externals = [externals, 'swisseph'];
      }
    }

    // Performance optimizations - simplified to reduce build memory usage
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic', // Better long-term caching
    };

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@opentelemetry\/instrumentation/ },
      { message: /Critical dependency: the request of a dependency is an expression/ },
    ];
    return config;
  },
};

// Sentry wrapper enabled for production error monitoring
export default withSentryConfig(nextConfig, {
  org: "destinypal",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
  webpack: {
    // Updated per Sentry deprecation: use webpack.automaticVercelMonitors
    automaticVercelMonitors: true,
  },
});

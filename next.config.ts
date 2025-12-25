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

  // Native Node.js modules that should not be bundled
  // This is required for Turbopack compatibility with native modules like swisseph
  serverExternalPackages: ['swisseph'],

  // Experimental performance features
  experimental: {
    optimizeCss: true, // CSS optimization
    scrollRestoration: true, // Remember scroll position
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
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.clarity.ms https://va.vercel-scripts.com https://cdnjs.cloudflare.com",
          "worker-src 'self' blob: https://cdnjs.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https: http:",
          `connect-src ${connectSrc.join(' ')}`,
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
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
    { isServer: _isServer }: { isServer: boolean }
  ) => {
    // swisseph는 서버와 클라이언트 빌드 모두에서 외부 모듈로 처리해야 합니다.
    // 서버: 번들링에서 제외하고 런타임에 Node.js가 require() 하도록 합니다.
    // 클라이언트: 번들링에서 제외하여, 클라이언트 코드에서 실수로 import하는 것을 막습니다.

    // 기존 externals 설정을 안전하게 확장합니다.
    const externals = config.externals || [];
    if (Array.isArray(externals)) {
      // 기존 externals가 배열인 경우, 새 항목을 추가합니다.
      config.externals = [...externals, 'swisseph'];
    } else {
      // 기존 externals가 배열이 아닌 경우(객체, 함수 등),
      // 새 배열을 만들어 기존 값과 새 값을 모두 포함시킵니다.
      config.externals = [externals, 'swisseph'];
    }

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

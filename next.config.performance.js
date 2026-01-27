/**
 * Performance Optimization Configuration for Next.js
 *
 * This file contains performance-focused settings that can be merged
 * into the main next.config.js
 */

const performanceConfig = {
  // Image Optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Compiler Optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,

    // React compiler optimizations
    reactRemoveProperties: process.env.NODE_ENV === 'production',

    // Minify class names
    styledComponents: true,
  },

  // Experimental Features for Performance
  experimental: {
    // Enable React Compiler (if using React 19)
    reactCompiler: true,

    // Optimize package imports
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'react-chartjs-2',
      'dompurify',
    ],

    // Enable PPR (Partial Pre-Rendering) for faster initial loads
    ppr: 'incremental',

    // Optimize CSS
    optimizeCss: true,

    // Use SWC minifier
    swcMinify: true,
  },

  // Webpack Bundle Analyzer
  webpack: (config, { isServer, webpack }) => {
    // Bundle analyzer in development
    if (!isServer && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer')({
        enabled: true,
      });
    }

    // Optimize chunks
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )?.[1];
              return `vendor.${packageName?.replace('@', '')}`;
            },
            priority: 10,
          },
          // Common chunks
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
          // React/React-DOM chunk
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react',
            priority: 20,
          },
          // Chart.js chunk (large library)
          charts: {
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
            name: 'charts',
            priority: 15,
          },
        },
      },
    };

    // Add webpack plugins for performance
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NEXT_PUBLIC_BUILD_TIME': JSON.stringify(new Date().toISOString()),
      })
    );

    return config;
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,

  // Production Source Maps (disable for faster builds)
  productionBrowserSourceMaps: false,

  // Power by header (remove for security)
  poweredByHeader: false,

  // Generate ETags
  generateEtags: true,

  // Output file tracing for smaller deployments
  outputFileTracing: true,
};

module.exports = performanceConfig;

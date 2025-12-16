// src/instrumentation-client.ts
// Client-side Sentry initialization for Next.js
// This file is automatically loaded by Next.js on the client

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring - adjust sampling rate for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay configuration for session recording (optional)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // Debug mode
  debug: false,

  // Filter out browser-specific noise
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Filter out common non-actionable errors
    if (error instanceof Error) {
      const message = error.message?.toLowerCase() || '';

      // Network errors are usually client-side issues
      if (message.includes('network') || message.includes('fetch failed')) {
        return null;
      }

      // Chunk loading errors are usually due to deployments
      if (message.includes('loading chunk') || message.includes('loading css chunk')) {
        return null;
      }

      // ResizeObserver errors are non-actionable
      if (message.includes('resizeobserver')) {
        return null;
      }
    }

    return event;
  },

  // Ignore common browser extension errors
  ignoreErrors: [
    // Browser extension errors
    /^chrome-extension:/,
    /^moz-extension:/,
    /^safari-extension:/,
    // Common third-party errors
    /Script error/i,
    /ResizeObserver loop/,
  ],
});

// Export hook to instrument router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

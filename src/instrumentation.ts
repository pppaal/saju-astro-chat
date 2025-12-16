// src/instrumentation.ts
// Next.js instrumentation file for Sentry error monitoring
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from '@sentry/nextjs';

// Export error handler for nested React Server Components
export const onRequestError = Sentry.captureRequestError;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,

      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Debug mode for development
      debug: false,

      // Filter out certain errors
      beforeSend(event, hint) {
        // Don't send errors in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
          return null;
        }

        // Filter out known non-actionable errors
        const error = hint.originalException;
        if (error instanceof Error) {
          // Rate limit errors are expected
          if (error.message?.includes('Too many requests')) {
            return null;
          }
          // Authentication errors are user-facing
          if (error.message?.includes('Unauthorized')) {
            return null;
          }
        }

        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: false,
    });
  }
}

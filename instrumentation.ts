/**
 * Next.js Instrumentation
 *
 * This file is called once when the server starts.
 * Use it to initialize monitoring, tracing, and other infrastructure.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { logger } from '@/lib/logger';

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize OpenTelemetry tracing
    const { initTracing } = await import('@/lib/telemetry/tracing');
    initTracing();

    // Initialize Sentry (if configured)
    if (process.env.SENTRY_DSN) {
      await import('./sentry.server.config');
    }

    logger.info('[Instrumentation] Server instrumentation loaded');
  }

  // Edge runtime instrumentation
  if (process.env.NEXT_RUNTIME === 'edge') {
    logger.info('[Instrumentation] Edge runtime instrumentation loaded');
  }
}

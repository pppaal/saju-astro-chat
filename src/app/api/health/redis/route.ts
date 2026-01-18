/**
 * Redis Health Check API
 * Monitors Redis connection status and cache health
 */

import { NextRequest } from 'next/server';
import { withApiMiddleware, apiSuccess } from '@/lib/api/middleware';
import { healthCheck as sessionHealthCheck } from '@/lib/cache/redis-session';
import { rateLimitHealthCheck } from '@/lib/cache/redis-rate-limit';
import { getCacheInfo } from '@/lib/cache/redis-cache';

/**
 * GET /api/health/redis
 * Check Redis connection and cache status
 */
export const GET = withApiMiddleware(
  async () => {
    // Check all Redis subsystems
    const [sessionHealth, rateLimitHealth, cacheInfo] = await Promise.all([
      sessionHealthCheck(),
      rateLimitHealthCheck(),
      getCacheInfo(),
    ]);

    const timestamp = new Date().toISOString();

    return apiSuccess({
      timestamp,
      session: {
        redis: sessionHealth.redis,
        memory: sessionHealth.memory,
        sessionCount: sessionHealth.sessionCount,
      },
      rateLimit: {
        redis: rateLimitHealth.redis,
        upstash: rateLimitHealth.upstash,
        memory: rateLimitHealth.memory,
      },
      cache: {
        info: cacheInfo ? 'available' : 'unavailable',
      },
      overall: {
        status: sessionHealth.redis || rateLimitHealth.redis || rateLimitHealth.upstash
          ? 'healthy'
          : 'degraded',
        redisAvailable: sessionHealth.redis,
        fallbackActive: sessionHealth.memory || rateLimitHealth.memory,
      },
    });
  },
  {
    requireToken: true,
    rateLimit: {
      limit: 30,
      windowSeconds: 60,
      keyPrefix: 'health:redis',
    },
  }
);

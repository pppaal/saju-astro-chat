/**
 * Rate Limiting with Redis + Upstash Fallback
 * Migrated to use IORedis for better performance with Upstash REST fallback
 *
 * Upgrade path:
 * - Primary: IORedis (fast, persistent connection)
 * - Secondary: Upstash REST (reliable HTTP fallback)
 * - Tertiary: In-memory (emergency fallback)
 */

export { rateLimit, resetRateLimit, getRateLimitStatus, rateLimitHealthCheck } from './cache/redis-rate-limit';
export type { RateLimitResult } from './cache/redis-rate-limit';

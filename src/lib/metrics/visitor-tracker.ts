/**
 * Visitor Tracking Module for Vercel Serverless
 *
 * Uses Redis (Upstash) for persistent visitor tracking across serverless functions
 * Falls back to in-memory storage if Redis is not available
 */

import { logger } from '@/lib/logger'
import type { Redis as UpstashRedis } from '@upstash/redis'

// Type for standard Redis client methods we use
interface StandardRedisClient {
  sAdd: (key: string, value: string) => Promise<number>
  sCard: (key: string) => Promise<number>
  expire: (key: string, seconds: number) => Promise<boolean>
  del: (keys: string[]) => Promise<number>
}

// Type for unified Redis client interface
type RedisClient = UpstashRedis | StandardRedisClient

// In-memory fallback storage
const memoryStore = {
  today: new Set<string>(),
  total: new Set<string>(),
  lastReset: new Date().toDateString(),
}

/**
 * Get Redis client with lazy loading
 */
async function getRedisClient(): Promise<RedisClient | null> {
  try {
    // Try Upstash REST API first (recommended for Vercel)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Redis } = await import('@upstash/redis')
      return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    }

    // Fall back to standard Redis
    if (process.env.REDIS_URL) {
      const { createClient } = await import('redis')
      const client = createClient({ url: process.env.REDIS_URL })
      await client.connect()
      return client
    }

    return null
  } catch (error) {
    logger.error('[Visitor Tracker] Redis connection failed', error)
    return null
  }
}

/**
 * Get today's date string for key suffix in KST timezone
 */
function getTodayKey(): string {
  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const kstDate = new Date(now.getTime() + kstOffset)
  const year = kstDate.getUTCFullYear()
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Track a visitor by unique ID
 */
export async function trackVisitor(visitorId: string): Promise<void> {
  try {
    const redis = await getRedisClient()

    if (redis) {
      // Redis mode - use Sets for deduplication
      const todayKey = `visitors:today:${getTodayKey()}`
      const totalKey = `visitors:total`

      // Check if using Upstash or standard Redis
      if ('sadd' in redis) {
        // Upstash Redis
        const upstashRedis = redis as UpstashRedis
        await Promise.all([
          upstashRedis.sadd(todayKey, visitorId),
          upstashRedis.sadd(totalKey, visitorId),
          upstashRedis.expire(todayKey, 86400 * 7), // Keep for 7 days
        ])
      } else {
        // Standard Redis client
        const standardRedis = redis as StandardRedisClient
        await Promise.all([
          standardRedis.sAdd(todayKey, visitorId),
          standardRedis.sAdd(totalKey, visitorId),
          standardRedis.expire(todayKey, 86400 * 7),
        ])
      }

      logger.debug('[Visitor Tracker] Tracked visitor via Redis', { visitorId })
    } else {
      // Fallback to in-memory
      const today = new Date().toDateString()
      if (memoryStore.lastReset !== today) {
        memoryStore.today.clear()
        memoryStore.lastReset = today
      }
      memoryStore.today.add(visitorId)
      memoryStore.total.add(visitorId)
      logger.debug('[Visitor Tracker] Tracked visitor via memory', { visitorId })
    }
  } catch (error) {
    logger.error('[Visitor Tracker] Failed to track visitor', error)
  }
}

/**
 * Get current visitor statistics
 */
export async function getVisitorStats(): Promise<{
  todayVisitors: number
  totalVisitors: number
}> {
  try {
    const redis = await getRedisClient()

    if (redis) {
      const todayKey = `visitors:today:${getTodayKey()}`
      const totalKey = `visitors:total`

      let todayCount: number = 0
      let totalCount: number = 0

      // Check if using Upstash or standard Redis
      if ('scard' in redis) {
        // Upstash Redis
        const upstashRedis = redis as UpstashRedis
        const [today, total] = await Promise.all([
          upstashRedis.scard(todayKey),
          upstashRedis.scard(totalKey),
        ])
        todayCount = Number(today) || 0
        totalCount = Number(total) || 0
      } else {
        // Standard Redis client
        const standardRedis = redis as StandardRedisClient
        const [today, total] = await Promise.all([
          standardRedis.sCard(todayKey),
          standardRedis.sCard(totalKey),
        ])
        todayCount = Number(today) || 0
        totalCount = Number(total) || 0
      }

      return {
        todayVisitors: Number(todayCount) || 0,
        totalVisitors: Number(totalCount) || 0,
      }
    } else {
      // Fallback to in-memory
      const today = new Date().toDateString()
      if (memoryStore.lastReset !== today) {
        memoryStore.today.clear()
        memoryStore.lastReset = today
      }

      return {
        todayVisitors: memoryStore.today.size,
        totalVisitors: memoryStore.total.size,
      }
    }
  } catch (error) {
    logger.error('[Visitor Tracker] Failed to get stats', error)
    return {
      todayVisitors: 0,
      totalVisitors: 0,
    }
  }
}

/**
 * Reset all visitor statistics (for testing/admin purposes)
 */
export async function resetVisitorStats(): Promise<void> {
  try {
    const redis = await getRedisClient()

    if (redis) {
      const todayKey = `visitors:today:${getTodayKey()}`
      const totalKey = `visitors:total`

      if ('del' in redis) {
        // Upstash Redis
        const upstashRedis = redis as UpstashRedis
        await upstashRedis.del(todayKey, totalKey)
      } else {
        // Standard Redis client
        const standardRedis = redis as StandardRedisClient
        await standardRedis.del([todayKey, totalKey])
      }

      logger.info('[Visitor Tracker] Stats reset via Redis')
    } else {
      memoryStore.today.clear()
      memoryStore.total.clear()
      memoryStore.lastReset = new Date().toDateString()
      logger.info('[Visitor Tracker] Stats reset via memory')
    }
  } catch (error) {
    logger.error('[Visitor Tracker] Failed to reset stats', error)
  }
}

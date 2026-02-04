/**
 * Visitor Tracking Module for Vercel Serverless
 *
 * Uses Upstash Redis for persistent visitor tracking across serverless functions
 * Falls back to in-memory storage if Redis is not available
 */

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

// Legacy visitor count from Firebase Firestore (migrated to Redis)
const LEGACY_TOTAL_OFFSET = 1572

// In-memory fallback storage
const memoryStore = {
  today: new Set<string>(),
  total: new Set<string>(),
  lastReset: new Date().toDateString(),
}

// Upstash Redis client singleton
let redis: Redis | null = null

/**
 * Get Redis client
 */
function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  if (redis) {
    return redis
  }

  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  return redis
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
    const client = getRedisClient()

    if (client) {
      const todayKey = `visitors:today:${getTodayKey()}`
      const totalKey = `visitors:total`

      await Promise.all([
        client.sadd(todayKey, visitorId),
        client.sadd(totalKey, visitorId),
        client.expire(todayKey, 86400 * 7), // Keep for 7 days
      ])

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
    const client = getRedisClient()

    if (client) {
      const todayKey = `visitors:today:${getTodayKey()}`
      const totalKey = `visitors:total`

      const [todayCount, totalCount] = await Promise.all([
        client.scard(todayKey),
        client.scard(totalKey),
      ])

      return {
        todayVisitors: Number(todayCount) || 0,
        totalVisitors: (Number(totalCount) || 0) + LEGACY_TOTAL_OFFSET,
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
        totalVisitors: memoryStore.total.size + LEGACY_TOTAL_OFFSET,
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
    const client = getRedisClient()

    if (client) {
      const todayKey = `visitors:today:${getTodayKey()}`
      const totalKey = `visitors:total`

      await client.del(todayKey, totalKey)

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

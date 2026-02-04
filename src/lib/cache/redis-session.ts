/**
 * Redis Session Cache Manager
 * Distributed session storage for Next.js with fallback to in-memory
 *
 * Features:
 * - Upstash Redis (HTTP/REST, serverless-friendly)
 * - Automatic fallback to in-memory cache
 * - Session TTL management
 * - AES-256-GCM encryption for session data (when TOKEN_ENCRYPTION_KEY is set)
 */

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'
import { encryptToken, decryptToken, hasTokenEncryptionKey } from '@/lib/security/tokenCrypto'

// Session configuration
const SESSION_TTL_SECONDS = 24 * 60 * 60 // 24 hours
const SESSION_PREFIX = 'session:'
const ENCRYPTION_ENABLED = hasTokenEncryptionKey()

// Log encryption status on module load
if (ENCRYPTION_ENABLED) {
  logger.info('[RedisSession] Session encryption enabled (AES-256-GCM)')
} else {
  logger.warn(
    '[RedisSession] Session encryption disabled - set TOKEN_ENCRYPTION_KEY for production'
  )
}

// Upstash Redis client singleton
let redisClient: Redis | null = null

// In-memory fallback for when Redis is unavailable
interface MemorySessionData {
  data: unknown
  expiresAt: number
}

const memoryStore = new Map<string, MemorySessionData>()
const MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Get or create Upstash Redis client
 */
function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  if (redisClient) {
    return redisClient
  }

  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  return redisClient
}

/**
 * Cleanup expired in-memory sessions
 */
function cleanupMemoryStore(): void {
  const now = Date.now()
  let cleaned = 0

  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt < now) {
      memoryStore.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    logger.debug(`[RedisSession] Cleaned up ${cleaned} expired memory sessions`)
  }
}

// Setup periodic cleanup for memory store
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryStore, MEMORY_CLEANUP_INTERVAL)
}

/**
 * Generate session key
 */
function getSessionKey(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}`
}

/**
 * Encrypt session data if encryption is enabled
 */
function encryptSessionData(data: unknown): string {
  const jsonData = JSON.stringify(data)
  if (!ENCRYPTION_ENABLED) {
    return jsonData
  }
  const encrypted = encryptToken(jsonData)
  return encrypted ?? jsonData
}

/**
 * Decrypt session data if encryption is enabled
 */
function decryptSessionData<T>(payload: string): T | null {
  if (!ENCRYPTION_ENABLED) {
    try {
      return JSON.parse(payload) as T
    } catch {
      return null
    }
  }

  const decrypted = decryptToken(payload)
  if (!decrypted) {
    // Fallback: try parsing as unencrypted JSON (for backward compatibility)
    try {
      return JSON.parse(payload) as T
    } catch {
      return null
    }
  }

  try {
    return JSON.parse(decrypted) as T
  } catch {
    return null
  }
}

/**
 * Store session data
 */
export async function setSession(
  sessionId: string,
  data: unknown,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<boolean> {
  const key = getSessionKey(sessionId)

  try {
    const client = getRedisClient()
    const encryptedData = encryptSessionData(data)

    if (client) {
      try {
        await client.set(key, encryptedData, { ex: ttlSeconds })
        return true
      } catch (error) {
        logger.warn('[RedisSession] Redis set failed, falling back to memory:', error)
      }
    }

    // Fallback to memory (store encrypted data for consistency)
    memoryStore.set(key, {
      data: encryptedData,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })

    return true
  } catch (error) {
    logger.error('[RedisSession] Failed to set session:', error)
    return false
  }
}

/**
 * Retrieve session data
 */
export async function getSession<T = unknown>(sessionId: string): Promise<T | null> {
  const key = getSessionKey(sessionId)

  try {
    const client = getRedisClient()

    if (client) {
      try {
        const encryptedData = await client.get<string>(key)
        if (encryptedData) {
          return decryptSessionData<T>(encryptedData)
        }
      } catch (error) {
        logger.warn('[RedisSession] Redis get failed, falling back to memory:', error)
      }
    }

    // Fallback to memory
    const memoryData = memoryStore.get(key)
    if (memoryData) {
      if (memoryData.expiresAt > Date.now()) {
        // Memory stores encrypted string now
        if (typeof memoryData.data === 'string') {
          return decryptSessionData<T>(memoryData.data)
        }
        return memoryData.data as T
      }
      // Expired
      memoryStore.delete(key)
    }

    return null
  } catch (error) {
    logger.error('[RedisSession] Failed to get session:', error)
    return null
  }
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const key = getSessionKey(sessionId)

  try {
    const client = getRedisClient()

    if (client) {
      try {
        await client.del(key)
      } catch (error) {
        logger.warn('[RedisSession] Redis delete failed:', error)
      }
    }

    // Also delete from memory
    memoryStore.delete(key)

    return true
  } catch (error) {
    logger.error('[RedisSession] Failed to delete session:', error)
    return false
  }
}

/**
 * Extend session TTL
 */
export async function touchSession(
  sessionId: string,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<boolean> {
  const key = getSessionKey(sessionId)

  try {
    const client = getRedisClient()

    if (client) {
      try {
        await client.expire(key, ttlSeconds)
        return true
      } catch (error) {
        logger.warn('[RedisSession] Redis expire failed:', error)
      }
    }

    // Fallback: update memory expiration
    const memoryData = memoryStore.get(key)
    if (memoryData) {
      memoryData.expiresAt = Date.now() + ttlSeconds * 1000
      return true
    }

    return false
  } catch (error) {
    logger.error('[RedisSession] Failed to touch session:', error)
    return false
  }
}

/**
 * Get all sessions by pattern (use with caution in production)
 */
export async function getSessionsByPattern(pattern: string = '*'): Promise<string[]> {
  try {
    const client = getRedisClient()

    if (client) {
      try {
        let cursor = 0 as number | string
        const allKeys: string[] = []

        do {
          const result: [number | string, string[]] = await client.scan(cursor, {
            match: `${SESSION_PREFIX}${pattern}`,
            count: 100,
          })
          cursor = result[0]
          allKeys.push(...result[1])
        } while (String(cursor) !== '0')

        return allKeys.map((key) => key.replace(SESSION_PREFIX, ''))
      } catch (error) {
        logger.warn('[RedisSession] Redis scan failed:', error)
      }
    }

    // Fallback: return memory keys
    const memoryKeys: string[] = []
    for (const key of memoryStore.keys()) {
      if (key.startsWith(SESSION_PREFIX)) {
        memoryKeys.push(key.replace(SESSION_PREFIX, ''))
      }
    }

    return memoryKeys
  } catch (error) {
    logger.error('[RedisSession] Failed to get sessions by pattern:', error)
    return []
  }
}

/**
 * Get session count (useful for monitoring)
 */
export async function getSessionCount(): Promise<number> {
  try {
    const client = getRedisClient()

    if (client) {
      try {
        let cursor = 0 as number | string
        let count = 0

        do {
          const result: [number | string, string[]] = await client.scan(cursor, {
            match: `${SESSION_PREFIX}*`,
            count: 100,
          })
          cursor = result[0]
          count += result[1].length
        } while (String(cursor) !== '0')

        return count
      } catch (error) {
        logger.warn('[RedisSession] Redis count failed:', error)
      }
    }

    // Fallback: count memory sessions
    let count = 0
    const now = Date.now()

    for (const [key, value] of memoryStore.entries()) {
      if (key.startsWith(SESSION_PREFIX) && value.expiresAt > now) {
        count++
      }
    }

    return count
  } catch (error) {
    logger.error('[RedisSession] Failed to get session count:', error)
    return 0
  }
}

/**
 * Clear all sessions (dangerous - use only for testing/cleanup)
 */
export async function clearAllSessions(): Promise<number> {
  try {
    const client = getRedisClient()
    let count = 0

    if (client) {
      try {
        let cursor = 0 as number | string

        do {
          const result: [number | string, string[]] = await client.scan(cursor, {
            match: `${SESSION_PREFIX}*`,
            count: 100,
          })
          cursor = result[0]
          const keys = result[1]

          if (keys.length > 0) {
            await client.del(...keys)
            count += keys.length
          }
        } while (String(cursor) !== '0')
      } catch (error) {
        logger.warn('[RedisSession] Redis clear failed:', error)
      }
    }

    // Also clear memory
    for (const key of memoryStore.keys()) {
      if (key.startsWith(SESSION_PREFIX)) {
        memoryStore.delete(key)
        count++
      }
    }

    return count
  } catch (error) {
    logger.error('[RedisSession] Failed to clear sessions:', error)
    return 0
  }
}

/**
 * Check if session encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return ENCRYPTION_ENABLED
}

/**
 * Health check for Redis connection
 */
export async function healthCheck(): Promise<{
  redis: boolean
  memory: boolean
  sessionCount: number
  encrypted: boolean
}> {
  const client = getRedisClient()
  let redisHealthy = false

  if (client) {
    try {
      const pong = await client.ping()
      redisHealthy = pong === 'PONG'
    } catch {
      redisHealthy = false
    }
  }

  const sessionCount = await getSessionCount()

  return {
    redis: redisHealthy,
    memory: memoryStore.size > 0,
    sessionCount,
    encrypted: ENCRYPTION_ENABLED,
  }
}

/**
 * Gracefully disconnect Redis (no-op for Upstash HTTP)
 */
export async function disconnect(): Promise<void> {
  redisClient = null
}

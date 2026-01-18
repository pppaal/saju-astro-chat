/**
 * Redis Session Cache Manager
 * Distributed session storage for Next.js with fallback to in-memory
 *
 * Features:
 * - Redis-based distributed session storage
 * - Automatic fallback to in-memory cache
 * - Session TTL management
 * - Optimized for serverless environments
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// Session configuration
const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const SESSION_PREFIX = 'session:';

// Redis client singleton
let redisClient: Redis | null = null;
let isRedisAvailable = true;

// In-memory fallback for when Redis is unavailable
interface MemorySessionData {
  data: unknown;
  expiresAt: number;
}

const memoryStore = new Map<string, MemorySessionData>();
const MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize Redis client with connection pooling
 */
function initializeRedis(): Redis | null {
  if (!process.env.REDIS_URL) {
    logger.warn('[RedisSession] REDIS_URL not configured, using in-memory fallback');
    isRedisAvailable = false;
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('[RedisSession] Max retries exceeded, switching to memory fallback');
          isRedisAvailable = false;
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      enableOfflineQueue: false,
    });

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('[RedisSession] Connected to Redis');
      isRedisAvailable = true;
    });

    redisClient.on('error', (error) => {
      logger.error('[RedisSession] Redis error:', error);
      isRedisAvailable = false;
    });

    redisClient.on('close', () => {
      logger.warn('[RedisSession] Redis connection closed');
      isRedisAvailable = false;
    });

    redisClient.on('reconnecting', () => {
      logger.info('[RedisSession] Reconnecting to Redis...');
    });

    // Connect lazily
    redisClient.connect().catch((error) => {
      logger.error('[RedisSession] Initial connection failed:', error);
      isRedisAvailable = false;
    });

    return redisClient;
  } catch (error) {
    logger.error('[RedisSession] Failed to initialize Redis:', error);
    isRedisAvailable = false;
    return null;
  }
}

/**
 * Get Redis client or null if unavailable
 */
function getRedisClient(): Redis | null {
  if (!isRedisAvailable) {
    return null;
  }

  if (!redisClient) {
    return initializeRedis();
  }

  return redisClient;
}

/**
 * Cleanup expired in-memory sessions
 */
function cleanupMemoryStore(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt < now) {
      memoryStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`[RedisSession] Cleaned up ${cleaned} expired memory sessions`);
  }
}

// Setup periodic cleanup for memory store
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryStore, MEMORY_CLEANUP_INTERVAL);
}

/**
 * Generate session key
 */
function getSessionKey(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}`;
}

/**
 * Store session data
 */
export async function setSession(
  sessionId: string,
  data: unknown,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<boolean> {
  const key = getSessionKey(sessionId);

  try {
    const client = getRedisClient();

    if (client && isRedisAvailable) {
      // Try Redis first
      try {
        await client.setex(key, ttlSeconds, JSON.stringify(data));
        return true;
      } catch (error) {
        logger.warn('[RedisSession] Redis setex failed, falling back to memory:', error);
        isRedisAvailable = false;
      }
    }

    // Fallback to memory
    memoryStore.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return true;
  } catch (error) {
    logger.error('[RedisSession] Failed to set session:', error);
    return false;
  }
}

/**
 * Retrieve session data
 */
export async function getSession<T = unknown>(
  sessionId: string
): Promise<T | null> {
  const key = getSessionKey(sessionId);

  try {
    const client = getRedisClient();

    if (client && isRedisAvailable) {
      // Try Redis first
      try {
        const data = await client.get(key);
        if (data) {
          return JSON.parse(data) as T;
        }
      } catch (error) {
        logger.warn('[RedisSession] Redis get failed, falling back to memory:', error);
        isRedisAvailable = false;
      }
    }

    // Fallback to memory
    const memoryData = memoryStore.get(key);
    if (memoryData) {
      if (memoryData.expiresAt > Date.now()) {
        return memoryData.data as T;
      }
      // Expired
      memoryStore.delete(key);
    }

    return null;
  } catch (error) {
    logger.error('[RedisSession] Failed to get session:', error);
    return null;
  }
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const key = getSessionKey(sessionId);

  try {
    const client = getRedisClient();

    if (client && isRedisAvailable) {
      try {
        await client.del(key);
      } catch (error) {
        logger.warn('[RedisSession] Redis delete failed:', error);
      }
    }

    // Also delete from memory
    memoryStore.delete(key);

    return true;
  } catch (error) {
    logger.error('[RedisSession] Failed to delete session:', error);
    return false;
  }
}

/**
 * Extend session TTL
 */
export async function touchSession(
  sessionId: string,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<boolean> {
  const key = getSessionKey(sessionId);

  try {
    const client = getRedisClient();

    if (client && isRedisAvailable) {
      try {
        await client.expire(key, ttlSeconds);
        return true;
      } catch (error) {
        logger.warn('[RedisSession] Redis expire failed:', error);
        isRedisAvailable = false;
      }
    }

    // Fallback: update memory expiration
    const memoryData = memoryStore.get(key);
    if (memoryData) {
      memoryData.expiresAt = Date.now() + ttlSeconds * 1000;
      return true;
    }

    return false;
  } catch (error) {
    logger.error('[RedisSession] Failed to touch session:', error);
    return false;
  }
}

/**
 * Get all sessions by pattern (use with caution in production)
 */
export async function getSessionsByPattern(
  pattern: string = '*'
): Promise<string[]> {
  try {
    const client = getRedisClient();

    if (client && isRedisAvailable) {
      try {
        const keys = await client.keys(`${SESSION_PREFIX}${pattern}`);
        return keys.map((key) => key.replace(SESSION_PREFIX, ''));
      } catch (error) {
        logger.warn('[RedisSession] Redis keys scan failed:', error);
      }
    }

    // Fallback: return memory keys
    const memoryKeys: string[] = [];
    for (const key of memoryStore.keys()) {
      if (key.startsWith(SESSION_PREFIX)) {
        memoryKeys.push(key.replace(SESSION_PREFIX, ''));
      }
    }

    return memoryKeys;
  } catch (error) {
    logger.error('[RedisSession] Failed to get sessions by pattern:', error);
    return [];
  }
}

/**
 * Get session count (useful for monitoring)
 */
export async function getSessionCount(): Promise<number> {
  try {
    const client = getRedisClient();

    if (client && isRedisAvailable) {
      try {
        const keys = await client.keys(`${SESSION_PREFIX}*`);
        return keys.length;
      } catch (error) {
        logger.warn('[RedisSession] Redis count failed:', error);
      }
    }

    // Fallback: count memory sessions
    let count = 0;
    const now = Date.now();

    for (const [key, value] of memoryStore.entries()) {
      if (key.startsWith(SESSION_PREFIX) && value.expiresAt > now) {
        count++;
      }
    }

    return count;
  } catch (error) {
    logger.error('[RedisSession] Failed to get session count:', error);
    return 0;
  }
}

/**
 * Clear all sessions (dangerous - use only for testing/cleanup)
 */
export async function clearAllSessions(): Promise<number> {
  try {
    const client = getRedisClient();
    let count = 0;

    if (client && isRedisAvailable) {
      try {
        const keys = await client.keys(`${SESSION_PREFIX}*`);
        if (keys.length > 0) {
          count = await client.del(...keys);
        }
      } catch (error) {
        logger.warn('[RedisSession] Redis clear failed:', error);
      }
    }

    // Also clear memory
    for (const key of memoryStore.keys()) {
      if (key.startsWith(SESSION_PREFIX)) {
        memoryStore.delete(key);
        count++;
      }
    }

    return count;
  } catch (error) {
    logger.error('[RedisSession] Failed to clear sessions:', error);
    return 0;
  }
}

/**
 * Health check for Redis connection
 */
export async function healthCheck(): Promise<{
  redis: boolean;
  memory: boolean;
  sessionCount: number;
}> {
  const client = getRedisClient();
  let redisHealthy = false;

  if (client) {
    try {
      await client.ping();
      redisHealthy = true;
      isRedisAvailable = true;
    } catch {
      redisHealthy = false;
      isRedisAvailable = false;
    }
  }

  const sessionCount = await getSessionCount();

  return {
    redis: redisHealthy,
    memory: memoryStore.size > 0,
    sessionCount,
  };
}

/**
 * Gracefully disconnect Redis (for shutdown)
 */
export async function disconnect(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
    } catch (error) {
      logger.error('[RedisSession] Failed to disconnect:', error);
    }
  }
}
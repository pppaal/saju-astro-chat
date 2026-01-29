/**
 * Rate Limiting System
 *
 * @deprecated This file is deprecated. Use @/lib/rateLimit instead which provides
 * Redis-backed rate limiting with Upstash fallback for better performance and reliability.
 * This in-memory implementation is kept for reference only.
 *
 * Prevent API abuse with flexible rate limiting strategies
 */

import { NextRequest } from 'next/server'
import { rateLimitError } from '@/lib/api/errorResponse'

// ============ Rate Limit Store ============

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimitStore {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key)
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry)
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

const globalStore = new RateLimitStore()

// ============ Rate Limit Configuration ============

export interface RateLimitConfig {
  /** Maximum requests allowed */
  maxRequests: number

  /** Time window in seconds */
  windowSeconds: number

  /** Identifier strategy */
  keyStrategy?: 'ip' | 'userId' | 'sessionId' | ((req: NextRequest) => string)

  /** Custom message */
  message?: string

  /** Skip rate limiting for certain conditions */
  skip?: (req: NextRequest) => boolean
}

// ============ Preset Configurations ============

export const RATE_LIMITS = {
  /** Strict: 10 requests per minute */
  STRICT: {
    maxRequests: 10,
    windowSeconds: 60,
  },

  /** Standard: 30 requests per minute */
  STANDARD: {
    maxRequests: 30,
    windowSeconds: 60,
  },

  /** Generous: 100 requests per minute */
  GENEROUS: {
    maxRequests: 100,
    windowSeconds: 60,
  },

  /** API: 1000 requests per hour */
  API: {
    maxRequests: 1000,
    windowSeconds: 3600,
  },

  /** Auth: 5 login attempts per 15 minutes */
  AUTH: {
    maxRequests: 5,
    windowSeconds: 900,
  },

  /** Chat: 20 messages per minute */
  CHAT: {
    maxRequests: 20,
    windowSeconds: 60,
  },

  /** AI Generation: 10 requests per 5 minutes */
  AI_GENERATION: {
    maxRequests: 10,
    windowSeconds: 300,
  },
} as const

// ============ Rate Limit Checker ============

/**
 * Get identifier for rate limiting
 */
function getIdentifier(req: NextRequest, strategy?: RateLimitConfig['keyStrategy']): string {
  if (typeof strategy === 'function') {
    return strategy(req)
  }

  switch (strategy) {
    case 'userId':
      // Get userId from session/auth header
      // This is a placeholder - implement based on your auth system
      return req.headers.get('x-user-id') || 'anonymous'

    case 'sessionId':
      return req.cookies.get('sessionId')?.value || 'no-session'

    case 'ip':
    default:
      return (
        req.headers.get('x-forwarded-for')?.split(',')[0] ||
        req.headers.get('x-real-ip') ||
        'unknown'
      )
  }
}

/**
 * Check if request is rate limited
 *
 * @returns null if allowed, error response if rate limited
 */
export function checkRateLimit(req: NextRequest, config: RateLimitConfig) {
  // Skip if specified
  if (config.skip?.(req)) {
    return null
  }

  const identifier = getIdentifier(req, config.keyStrategy)
  const key = `ratelimit:${identifier}:${req.nextUrl.pathname}`
  const now = Date.now()

  const entry = globalStore.get(key)

  if (!entry || entry.resetTime < now) {
    // First request or window expired, create new entry
    globalStore.set(key, {
      count: 1,
      resetTime: now + config.windowSeconds * 1000,
    })
    return null
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return rateLimitError(retryAfter)
  }

  // Increment counter
  entry.count += 1
  globalStore.set(key, entry)

  return null
}

/**
 * Rate limit middleware wrapper
 *
 * @example
 * export const POST = withRateLimit(
 *   async (req) => {
 *     // Your handler
 *   },
 *   RATE_LIMITS.CHAT
 * );
 */
export function withRateLimit<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<Response>,
  config: RateLimitConfig
) {
  return async (req: NextRequest, ...args: T): Promise<Response> => {
    const rateLimitResponse = checkRateLimit(req, config)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    return handler(req, ...args)
  }
}

// ============ Sliding Window Rate Limiter ============

interface SlidingWindowEntry {
  timestamps: number[]
}

class SlidingWindowStore {
  private store = new Map<string, SlidingWindowEntry>()

  check(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const entry = this.store.get(key) || { timestamps: [] }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((ts) => ts > now - windowMs)

    // Check if limit exceeded
    if (entry.timestamps.length >= maxRequests) {
      return false
    }

    // Add current timestamp
    entry.timestamps.push(now)
    this.store.set(key, entry)

    return true
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > now - 3600000) // Keep 1 hour
      if (entry.timestamps.length === 0) {
        this.store.delete(key)
      }
    }
  }
}

const slidingStore = new SlidingWindowStore()

/**
 * Sliding window rate limiter (more accurate)
 */
export function checkSlidingRateLimit(req: NextRequest, config: RateLimitConfig) {
  if (config.skip?.(req)) {
    return null
  }

  const identifier = getIdentifier(req, config.keyStrategy)
  const key = `sliding:${identifier}:${req.nextUrl.pathname}`
  const windowMs = config.windowSeconds * 1000

  const allowed = slidingStore.check(key, config.maxRequests, windowMs)

  if (!allowed) {
    return rateLimitError(config.windowSeconds)
  }

  return null
}

// ============ IP Whitelist/Blacklist ============

const whitelist = new Set<string>()
const blacklist = new Set<string>()

/**
 * Add IP to whitelist (bypass rate limiting)
 */
export function whitelistIP(ip: string): void {
  whitelist.add(ip)
}

/**
 * Add IP to blacklist (always deny)
 */
export function blacklistIP(ip: string): void {
  blacklist.add(ip)
}

/**
 * Check if IP is whitelisted
 */
export function isWhitelisted(req: NextRequest): boolean {
  const ip = getIdentifier(req, 'ip')
  return whitelist.has(ip)
}

/**
 * Check if IP is blacklisted
 */
export function isBlacklisted(req: NextRequest): boolean {
  const ip = getIdentifier(req, 'ip')
  return blacklist.has(ip)
}

// ============ Rate Limit Headers ============

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  config: RateLimitConfig,
  req: NextRequest
): Response {
  const identifier = getIdentifier(req, config.keyStrategy)
  const key = `ratelimit:${identifier}:${req.nextUrl.pathname}`
  const entry = globalStore.get(key)

  if (entry) {
    const remaining = Math.max(0, config.maxRequests - entry.count)
    const resetTime = Math.ceil(entry.resetTime / 1000)

    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', resetTime.toString())
  }

  return response
}

// ============ Cleanup ============

/**
 * Clean up rate limit store (call on server shutdown)
 */
export function cleanup(): void {
  globalStore.destroy()
  slidingStore.cleanup()
}

// Export default rate limiter
export default {
  check: checkRateLimit,
  checkSliding: checkSlidingRateLimit,
  with: withRateLimit,
  presets: RATE_LIMITS,
  whitelist: whitelistIP,
  blacklist: blacklistIP,
  isWhitelisted,
  isBlacklisted,
  addHeaders: addRateLimitHeaders,
  cleanup,
}

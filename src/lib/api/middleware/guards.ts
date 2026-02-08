/**
 * API Guard Presets
 * Pre-configured middleware options for common API patterns
 */

import type { CreditType } from '@/lib/credits'
import { RATE_LIMIT_PRESETS } from '@/lib/constants/api-limits'
import type { MiddlewareOptions } from './types'

// ============ Generic Guards ============

/**
 * Preset for public streaming APIs (e.g., tarot, iching, dream)
 * - Requires public token
 * - Rate limited (default: 30/60s)
 * - Optional credit consumption
 */
export function createPublicStreamGuard(options: {
  route: string
  limit?: number
  windowSeconds?: number
  requireCredits?: boolean
  creditType?: CreditType
  creditAmount?: number
}): MiddlewareOptions {
  return {
    route: options.route,
    requireToken: true,
    rateLimit: {
      limit: options.limit || RATE_LIMIT_PRESETS.DATA_READ.limit,
      windowSeconds: options.windowSeconds || RATE_LIMIT_PRESETS.DATA_READ.windowSeconds,
    },
    credits: options.requireCredits
      ? {
          type: options.creditType || 'reading',
          amount: options.creditAmount || 1,
        }
      : undefined,
  }
}

/**
 * Preset for authenticated APIs (e.g., saju chat, compatibility)
 * - Requires session authentication
 * - Rate limited (default: 60/60s)
 * - Optional credit consumption
 */
export function createAuthenticatedGuard(options: {
  route: string
  limit?: number
  windowSeconds?: number
  requireCredits?: boolean
  creditType?: CreditType
  creditAmount?: number
}): MiddlewareOptions {
  return {
    route: options.route,
    requireAuth: true,
    rateLimit: {
      limit: options.limit || 60,
      windowSeconds: options.windowSeconds || 60,
    },
    credits: options.requireCredits
      ? {
          type: options.creditType || 'reading',
          amount: options.creditAmount || 1,
        }
      : undefined,
  }
}

/**
 * Preset for simple rate-limited APIs
 * - No auth required
 * - Rate limited only
 */
export function createSimpleGuard(options: {
  route: string
  limit?: number
  windowSeconds?: number
}): MiddlewareOptions {
  return {
    route: options.route,
    rateLimit: {
      limit: options.limit || RATE_LIMIT_PRESETS.UTILITY.limit,
      windowSeconds: options.windowSeconds || RATE_LIMIT_PRESETS.UTILITY.windowSeconds,
    },
  }
}

// ============ Domain-Specific Guards ============

/**
 * Preset for Saju (사주) calculation APIs
 * - Requires public token
 * - Rate limited based on SAJU_CALCULATION preset
 * - No credit consumption (initial analysis is free)
 */
export function createSajuGuard(options?: {
  route?: string
  limit?: number
  windowSeconds?: number
}): MiddlewareOptions {
  return {
    route: options?.route || 'saju',
    requireToken: true,
    rateLimit: {
      limit: options?.limit || RATE_LIMIT_PRESETS.SAJU_CALCULATION.limit,
      windowSeconds: options?.windowSeconds || RATE_LIMIT_PRESETS.SAJU_CALCULATION.windowSeconds,
    },
  }
}

/**
 * Preset for Astrology calculation APIs
 * - Requires public token
 * - Rate limited based on ASTROLOGY_CALCULATION preset
 * - No credit consumption
 */
export function createAstrologyGuard(options?: {
  route?: string
  limit?: number
  windowSeconds?: number
}): MiddlewareOptions {
  return {
    route: options?.route || 'astrology',
    requireToken: true,
    rateLimit: {
      limit: options?.limit || RATE_LIMIT_PRESETS.ASTROLOGY_CALCULATION.limit,
      windowSeconds:
        options?.windowSeconds || RATE_LIMIT_PRESETS.ASTROLOGY_CALCULATION.windowSeconds,
    },
  }
}

/**
 * Preset for Tarot reading APIs
 * - Requires public token
 * - Rate limited based on TAROT_READING preset
 * - Optional credit consumption
 */
export function createTarotGuard(options?: {
  route?: string
  limit?: number
  windowSeconds?: number
  requireCredits?: boolean
  creditAmount?: number
}): MiddlewareOptions {
  return {
    route: options?.route || 'tarot',
    requireToken: true,
    rateLimit: {
      limit: options?.limit || RATE_LIMIT_PRESETS.TAROT_READING.limit,
      windowSeconds: options?.windowSeconds || RATE_LIMIT_PRESETS.TAROT_READING.windowSeconds,
    },
    credits: options?.requireCredits
      ? {
          type: 'reading',
          amount: options?.creditAmount || 1,
        }
      : undefined,
  }
}

/**
 * Preset for Admin APIs
 * - Requires authentication
 * - Rate limited based on ADMIN preset
 * - CSRF enforced
 */
export function createAdminGuard(options?: {
  route?: string
  limit?: number
  windowSeconds?: number
}): MiddlewareOptions {
  return {
    route: options?.route || 'admin',
    requireAuth: true,
    rateLimit: {
      limit: options?.limit || RATE_LIMIT_PRESETS.ADMIN.limit,
      windowSeconds: options?.windowSeconds || RATE_LIMIT_PRESETS.ADMIN.windowSeconds,
    },
  }
}

/**
 * Preset for AI generation APIs
 * - Requires authentication
 * - Strict rate limiting based on AI_GENERATION preset
 * - Usually requires credits
 */
export function createAiGenerationGuard(options?: {
  route?: string
  limit?: number
  windowSeconds?: number
  requireCredits?: boolean
  creditType?: CreditType
  creditAmount?: number
}): MiddlewareOptions {
  return {
    route: options?.route || 'ai',
    requireAuth: true,
    rateLimit: {
      limit: options?.limit || RATE_LIMIT_PRESETS.AI_GENERATION.limit,
      windowSeconds: options?.windowSeconds || RATE_LIMIT_PRESETS.AI_GENERATION.windowSeconds,
    },
    credits: options?.requireCredits
      ? {
          type: options?.creditType || 'reading',
          amount: options?.creditAmount || 1,
        }
      : undefined,
  }
}

/**
 * Preset for Chat/Streaming APIs
 * - Requires authentication
 * - Rate limited based on CHAT_STREAMING preset
 */
export function createChatGuard(options?: {
  route?: string
  limit?: number
  windowSeconds?: number
  requireCredits?: boolean
  creditType?: CreditType
  creditAmount?: number
}): MiddlewareOptions {
  return {
    route: options?.route || 'chat',
    requireAuth: true,
    rateLimit: {
      limit: options?.limit || RATE_LIMIT_PRESETS.CHAT_STREAMING.limit,
      windowSeconds: options?.windowSeconds || RATE_LIMIT_PRESETS.CHAT_STREAMING.windowSeconds,
    },
    credits: options?.requireCredits
      ? {
          type: options?.creditType || 'followUp',
          amount: options?.creditAmount || 1,
        }
      : undefined,
  }
}

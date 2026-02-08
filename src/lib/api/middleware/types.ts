/**
 * API Middleware Types
 * Shared type definitions for API middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { type Session } from 'next-auth'
import { type CreditType } from '@/lib/credits'
import { type ErrorCode } from '../errorHandler'

// ============ Context Types ============

export interface ApiContext {
  ip: string
  locale: string
  session: (Session & { user?: { id: string; email?: string | null; plan?: string } }) | null
  userId: string | null
  isAuthenticated: boolean
  isPremium: boolean
  creditInfo?: {
    remaining: number
    type?: CreditType
    consumed?: number
  }
  /** Refund credits on API error (only available when credits option is set) */
  refundCreditsOnError?: (errorMessage: string, metadata?: Record<string, unknown>) => Promise<void>
}

// ============ Option Types ============

export interface RateLimitOptions {
  /** Requests allowed per window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
  /** Optional key prefix for rate limiting */
  keyPrefix?: string
}

export interface CreditOptions {
  /** Credit type to consume */
  type: CreditType
  /** Amount of credits to consume */
  amount?: number
  /** If true, only check credits without consuming */
  checkOnly?: boolean
}

export interface MiddlewareOptions {
  /** Require valid public token */
  requireToken?: boolean
  /** Require authenticated session */
  requireAuth?: boolean
  /** Rate limiting configuration */
  rateLimit?: RateLimitOptions
  /** Credit consumption configuration */
  credits?: CreditOptions
  /** Route name for logging/metrics */
  route?: string
  /** Skip CSRF origin validation (default: false). CSRF is enforced on POST/PUT/PATCH/DELETE. */
  skipCsrf?: boolean
}

// ============ Handler Types ============

export interface ApiHandlerResult<T> {
  data?: T
  error?: {
    code: ErrorCode
    message?: string
    details?: unknown
  }
  status?: number
  headers?: Record<string, string>
  meta?: Record<string, unknown>
}

export type ApiHandler<T> = (
  req: NextRequest,
  context: ApiContext,
  ...args: unknown[]
) => Promise<ApiHandlerResult<T> | NextResponse | Response>

// ============ Re-exports ============

export type { CreditType }

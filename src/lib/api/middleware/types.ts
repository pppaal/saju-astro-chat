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
  /**
   * Rate limit headers computed by middleware (if enabled).
   * These should be merged into responses to keep headers consistent.
   */
  rateLimitHeaders?: Headers
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
  /**
   * Fail CLOSED (deny) when the Redis/Upstash backing store is unreachable
   * instead of the default fail-open. Set on expensive LLM routes so a Redis
   * outage can't let an authenticated user bypass the limiter and drain
   * Anthropic spend. Defaults to false (fail-open) for cheap/deterministic routes.
   */
  failClosed?: boolean
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
  /**
   * Require an admin session (implies requireAuth). When set, the middleware
   * verifies the session user via isAdminUser() and returns 401/403 before the
   * handler runs, so routes no longer repeat the auth+admin check inline.
   */
  requireAdmin?: boolean
  /** Rate limiting configuration */
  rateLimit?: RateLimitOptions
  /** Credit consumption configuration */
  credits?: CreditOptions
  /** Route name for logging/metrics */
  route?: string
  /** Skip CSRF origin validation (default: false). CSRF is enforced on POST/PUT/PATCH/DELETE. */
  skipCsrf?: boolean
  /**
   * 최대 요청 본문 크기(바이트). 설정 시 content-length 가 이를 넘으면 핸들러
   * 실행 *전* 413 으로 거부 — req.json() 이 거대 본문을 버퍼링하기 전에 막는다.
   * content-length 없으면(스트리밍) 통과. 미설정 시 플랫폼 한도에 위임.
   */
  maxBodyBytes?: number
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

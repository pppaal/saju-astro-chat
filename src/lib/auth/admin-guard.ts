/**
 * Admin Guard Utilities
 * Consolidates duplicate admin authentication patterns across 4+ routes
 *
 * Each route was repeating:
 * - Session check
 * - Admin role verification
 * - Logging for unauthorized access
 */

import { logger } from '@/lib/logger'
import { isAdminUser } from '@/lib/auth/admin'
import { apiError, ErrorCodes } from '@/lib/api/middleware'

// ============ Types ============

export interface AdminContext {
  userId: string | null
  session: {
    user?: {
      email?: string | null
      name?: string | null
      role?: string | null
    }
  } | null
}

export interface AdminCheckResult {
  isAdmin: true
  userId: string
  email: string
}

export interface AdminCheckFailure {
  isAdmin: false
  error: ReturnType<typeof apiError>
  reason: 'no_session' | 'unauthorized' | 'forbidden'
}

// ============ Admin Check Function ============

/**
 * Checks if the current context has admin access
 *
 * @example
 * const adminCheck = await checkAdminAccess(context, 'Metrics API')
 * if (!adminCheck.isAdmin) {
 *   return adminCheck.error
 * }
 * // adminCheck.userId and adminCheck.email are now available
 */
export async function checkAdminAccess(
  context: AdminContext,
  logPrefix: string
): Promise<AdminCheckResult | AdminCheckFailure> {
  // Check session exists
  if (!context.userId || !context.session?.user?.email) {
    logger.warn(`[${logPrefix}] No session or userId`, {
      hasSession: !!context.session,
      hasUserId: !!context.userId,
      hasEmail: !!context.session?.user?.email,
    })

    return {
      isAdmin: false,
      error: apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
      reason: 'no_session',
    }
  }

  // Check admin role
  const isAdmin = await isAdminUser(context.userId)

  if (!isAdmin) {
    logger.warn(`[${logPrefix}] Unauthorized access attempt`, {
      email: context.session.user.email,
      userId: context.userId,
    })

    return {
      isAdmin: false,
      error: apiError(ErrorCodes.FORBIDDEN, 'Forbidden'),
      reason: 'forbidden',
    }
  }

  return {
    isAdmin: true,
    userId: context.userId,
    email: context.session.user.email,
  }
}

/**
 * Simple synchronous check if context has valid session
 */
export function hasValidSession(context: AdminContext): context is {
  userId: string
  session: {
    user: {
      email: string
      name?: string | null
      role?: string | null
    }
  }
} {
  return !!context.userId && !!context.session?.user?.email
}

/**
 * Logs an admin action for audit trail
 */
export function logAdminAction(
  action: string,
  userId: string,
  email: string,
  details?: Record<string, unknown>
): void {
  logger.info(`[Admin Action] ${action}`, {
    userId,
    email,
    ...details,
  })
}

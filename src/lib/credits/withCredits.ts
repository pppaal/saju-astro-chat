import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import {
  consumeCredits,
  canUseCredits,
  getUserCredits,
  initializeUserCredits,
} from './creditService'
import { logger } from '@/lib/logger'

export type CreditType = 'reading' | 'compatibility' | 'followUp'

interface CreditCheckResult {
  allowed: boolean
  userId?: string
  error?: string
  errorCode?: string
  remaining?: number
  limitInfo?: {
    used: number
    limit: number
    planName?: string
  }
}

/**
 * í¬ë ˆë”§ ì²´í¬ ë° ì†Œë¹„ í—¬í¼
 * API routeì—ì„œ ì‚¬ìš©
 */
export async function checkAndConsumeCredits(
  type: CreditType = 'reading',
  amount: number = 1
): Promise<CreditCheckResult> {
  const session = await getServerSession(authOptions)

  // ë¹„ë¡œê·¸ì¸ ì‹œ free 1íšŒ í—ˆìš© (ë³„ë„ ë¡œì§ í•„ìš”)
  if (!session?.user?.id) {
    return {
      allowed: false,
      error: 'ë¡œê·¸ì¸ì´ í•„ìš”í•©ë‹ˆë‹¤',
      errorCode: 'not_authenticated',
    }
  }

  const userId = session.user.id

  // ðŸ”’ ë³´ì•ˆ: ê°œë°œ í™˜ê²½ì—ì„œë§Œ í¬ë ˆë”§ ìš°íšŒ í—ˆìš© (NODE_ENV ì²´í¬ ì¶”ê°€)
  // í”„ë¡œë•ì…˜ì—ì„œëŠ” ì ˆëŒ€ ìš°íšŒ ë¶ˆê°€
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  const bypassEnabled = process.env.BYPASS_CREDITS === 'true' && isDevelopment

  if (bypassEnabled) {
    logger.warn('[DEV ONLY] Credit check bypassed', { userId })
    return {
      allowed: true,
      userId,
      remaining: 9999,
    }
  }

  // í”„ë¡œë•ì…˜ì—ì„œ BYPASS_CREDITSê°€ ì„¤ì •ëœ ê²½ìš° ê²½ê³
  if (process.env.BYPASS_CREDITS === 'true' && !isDevelopment) {
    logger.error(
      'SECURITY WARNING: BYPASS_CREDITS is enabled in production! This is a critical security issue.'
    )
  }

  // í¬ë ˆë”§ ì²´í¬
  const canUse = await canUseCredits(userId, type, amount)
  if (!canUse.allowed) {
    const errorMessages: Record<string, string> = {
      no_credits:
        'ì´ë²ˆ ë‹¬ ë¦¬ë”© íšŸìˆ˜ë¥¼ ëª¨ë‘ ì‚¬ìš©í–ˆìŠµë‹ˆë‹¤. í”Œëžœì„ ì—…ê·¸ë ˆì´ë“œí•˜ì„¸ìš”.',
      compatibility_limit: 'ì´ë²ˆ ë‹¬ ê¶í•© ë¶„ì„ íšŸìˆ˜ë¥¼ ëª¨ë‘ ì‚¬ìš©í–ˆìŠµë‹ˆë‹¤.',
      followup_limit: 'ì´ë²ˆ ë‹¬ í›„ì†ì§ˆë¬¸ íšŸìˆ˜ë¥¼ ëª¨ë‘ ì‚¬ìš©í–ˆìŠµë‹ˆë‹¤.',
    }

    // Get detailed limit info for compatibility/followUp errors
    let limitInfo
    if (canUse.reason === 'compatibility_limit' || canUse.reason === 'followup_limit') {
      const userCredits = await getUserCredits(userId)
      if (userCredits) {
        const isCompatibility = canUse.reason === 'compatibility_limit'
        limitInfo = {
          used: isCompatibility ? userCredits.compatibilityUsed : userCredits.followUpUsed,
          limit: isCompatibility ? userCredits.compatibilityLimit : userCredits.followUpLimit,
          planName: userCredits.plan || 'Free',
        }
      }
    }

    return {
      allowed: false,
      userId,
      error: errorMessages[canUse.reason || ''] || 'í¬ë ˆë”§ì´ ë¶€ì¡±í•©ë‹ˆë‹¤',
      errorCode: canUse.reason,
      remaining: canUse.remaining,
      limitInfo,
    }
  }

  // í¬ë ˆë”§ ì†Œë¹„
  const consumeResult = await consumeCredits(userId, type, amount)
  if (!consumeResult.success) {
    return {
      allowed: false,
      userId,
      error: 'í¬ë ˆë”§ ì°¨ê° ì¤‘ ì˜¤ë¥˜ê°€ ë°œìƒí–ˆìŠµë‹ˆë‹¤',
      errorCode: consumeResult.error,
    }
  }

  return {
    allowed: true,
    userId,
    remaining: canUse.remaining,
  }
}

/**
 * í¬ë ˆë”§ ì²´í¬ë§Œ (ì†Œë¹„ ì•ˆ í•¨)
 * pre-checkìš©
 */
export async function checkCreditsOnly(
  type: CreditType = 'reading',
  amount: number = 1
): Promise<CreditCheckResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return {
      allowed: false,
      error: 'ë¡œê·¸ì¸ì´ í•„ìš”í•©ë‹ˆë‹¤',
      errorCode: 'not_authenticated',
    }
  }

  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  const bypassEnabled = process.env.BYPASS_CREDITS === 'true' && isDevelopment

  // ê°œë°œ/í…ŒìŠ¤íŠ¸ í™˜ê²½ì—ì„œ í¬ë ˆë”§ ìš°íšŒ
  if (bypassEnabled) {
    return {
      allowed: true,
      userId: session.user.id,
      remaining: 9999,
    }
  }

  // í”„ë¡œë•ì…˜ì—ì„œ BYPASS_CREDITSê°€ ì„¤ì •ëœ ê²½ìš° ê²½ê³
  if (process.env.BYPASS_CREDITS === 'true' && !isDevelopment) {
    logger.error(
      'SECURITY WARNING: BYPASS_CREDITS is enabled in production! This is a critical security issue.'
    )
  }

  const canUse = await canUseCredits(session.user.id, type, amount)
  return {
    allowed: canUse.allowed,
    userId: session.user.id,
    error: canUse.allowed ? undefined : 'í¬ë ˆë”§ì´ ë¶€ì¡±í•©ë‹ˆë‹¤',
    errorCode: canUse.reason,
    remaining: canUse.remaining,
  }
}

/**
 * NextResponse ì—ëŸ¬ ë°˜í™˜ í—¬í¼
 */
export function creditErrorResponse(result: CreditCheckResult): NextResponse {
  if (result.errorCode === 'not_authenticated') {
    return NextResponse.json({ error: result.error, code: result.errorCode }, { status: 401 })
  }

  return NextResponse.json(
    {
      error: result.error,
      code: result.errorCode,
      remaining: result.remaining,
      limitInfo: result.limitInfo,
      upgradeUrl: '/pricing',
    },
    { status: 402 } // Payment Required
  )
}

/**
 * ìœ ì € ê°€ìž… ì‹œ í¬ë ˆë”§ ì´ˆê¸°í™” í›…
 * (NextAuth callbacksì—ì„œ ì‚¬ìš©)
 */
export async function ensureUserCredits(userId: string): Promise<void> {
  try {
    const credits = await getUserCredits(userId)
    if (!credits) {
      await initializeUserCredits(userId, 'free')
    }
  } catch (err) {
    logger.error('[ensureUserCredits] Failed:', err)
  }
}

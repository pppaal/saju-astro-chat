/**
 * GET /api/compatibility/realtime/quota
 *
 * Returns the caller's current quota state for the realtime counselor so
 * the chat UI can display "남은 무료 답변 N/M" and surface upgrade nudges
 * before the user hits 402.
 *
 * Response shape:
 *   {
 *     mode: 'guest' | 'free' | 'paid',
 *     freeRemaining: number,     // 게스트 1, 로그인 0~2
 *     freeLimit: number,         // 1 게스트 / 2 로그인
 *     paidRemaining: number      // 로그인 사용자의 reading 크레딧 잔량 (게스트=0)
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { getCreditBalance } from '@/lib/credits/creditService'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GUEST_COOKIE_NAME = 'compat_realtime_guest_used'
const GUEST_FREE_LIMIT = 1
const LOGGED_IN_FREE_LIMIT = 2

export async function GET(req: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions).catch(() => null)
  const userId = session?.user?.id ?? null

  if (!userId) {
    const usedRaw = req.cookies.get(GUEST_COOKIE_NAME)?.value
    const used = Number.parseInt(usedRaw || '0', 10) || 0
    const remaining = Math.max(0, GUEST_FREE_LIMIT - used)
    return NextResponse.json({
      mode: 'guest',
      freeRemaining: remaining,
      freeLimit: GUEST_FREE_LIMIT,
      paidRemaining: 0,
    })
  }

  let freeUsed = 0
  try {
    const credits = await prisma.userCredits.findUnique({
      where: { userId },
      select: { compatRealtimeFreeUsed: true },
    })
    freeUsed = credits?.compatRealtimeFreeUsed ?? 0
  } catch (err) {
    // Migration not yet deployed — treat as fresh free quota.
    logger.warn('[compat/realtime/quota] missing column', err)
  }

  let paidRemaining = 0
  try {
    const balance = await getCreditBalance(userId)
    paidRemaining = balance.remainingCredits
  } catch (err) {
    logger.warn('[compat/realtime/quota] credit balance lookup failed', err)
  }

  const freeRemaining = Math.max(0, LOGGED_IN_FREE_LIMIT - freeUsed)
  return NextResponse.json({
    mode: freeRemaining > 0 ? 'free' : 'paid',
    freeRemaining,
    freeLimit: LOGGED_IN_FREE_LIMIT,
    paidRemaining,
  })
}

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  parseJsonBody,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { clearCacheByPattern } from '@/lib/cache/redis-cache'

// Edge 환경이면 Prisma/NextAuth 이슈가 있을 수 있어 Node 런타임을 강제
export const runtime = 'nodejs'

/**
 * 생년월일 변경 시 관련 Redis 캐시를 무효화한다.
 * 이전 birthDate/birthTime/gender 기반의 saju, destiny, yearly, calendar 키를 삭제.
 */
async function invalidateBirthCaches(
  userId: string,
  oldBirthDate: string | null
): Promise<number> {
  const patterns: string[] = []

  if (oldBirthDate) {
    // saju:{date}:{time}:{gender}
    patterns.push(`saju:${oldBirthDate}:*`)
    // destiny:{date}:{time}
    patterns.push(`destiny:${oldBirthDate}:*`)
    // yearly:v2:{date}:{time}:{gender}:*
    patterns.push(`yearly:v2:${oldBirthDate}:*`)
  }

  // cal:{year}:{month}:{userId} — userId 기반이라 birthDate 변경과 무관하게 무효화 필요
  patterns.push(`cal:*:*:${userId}`)

  let totalDeleted = 0
  await Promise.all(
    patterns.map(async (p) => {
      const count = await clearCacheByPattern(p)
      totalDeleted += count
    })
  )

  if (totalDeleted > 0) {
    logger.info(`[update-birth-info] Invalidated ${totalDeleted} cache keys for user ${userId}`)
  }

  return totalDeleted
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    // Parse and validate request body
    const body = await parseJsonBody<{
      birthDate?: string
      birthTime?: string
      gender?: string
      birthCity?: string
      tzId?: string
    }>(req)

    const { birthDate, birthTime, gender, birthCity, tzId } = body

    // Basic validation
    if (!birthDate) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Birth date is required')
    }

    // Get existing profile for cache invalidation
    const oldUser = await prisma.user.findUnique({
      where: { id: context.userId! },
      select: { birthDate: true, birthTime: true, gender: true },
    })

    // Update user profile
    const user = await prisma.user.update({
      where: { id: context.userId! },
      data: {
        birthDate: birthDate ?? null,
        birthTime: birthTime ?? null,
        gender: gender ?? null,
        birthCity: birthCity ?? null,
        tzId: tzId ?? null,
      },
      select: {
        id: true,
        birthDate: true,
        birthTime: true,
        gender: true,
        birthCity: true,
        tzId: true,
      },
    })

    // Invalidate cache if birth info changed
    const birthChanged =
      oldUser?.birthDate !== birthDate ||
      oldUser?.birthTime !== (birthTime ?? null) ||
      oldUser?.gender !== (gender ?? null)

    let cacheCleared = false
    if (birthChanged && oldUser) {
      await invalidateBirthCaches(
        context.userId!,
        oldUser.birthDate
      )
      cacheCleared = true
    }

    return apiSuccess({ ok: true, user, cacheCleared })
  },
  createAuthenticatedGuard({ route: 'user/update-birth-info', limit: 10 })
)

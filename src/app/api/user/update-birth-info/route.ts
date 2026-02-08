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
import { userBirthInfoUpdateSchema } from '@/lib/api/zodValidation'

// Edge 환경이면 Prisma/NextAuth 이슈가 있을 수 있어 Node 런타임을 강제
export const runtime = 'nodejs'

/**
 * 생년월일 변경 시 관련 Redis 캐시를 무효화한다.
 * 이전 birthDate/birthTime/gender 기반의 saju, destiny, yearly, calendar 키를 삭제.
 */
async function invalidateBirthCaches(userId: string, oldBirthDate: string | null): Promise<number> {
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
    const rawBody = await parseJsonBody<{
      birthDate?: string
      birthTime?: string
      gender?: string
      birthCity?: string
      tzId?: string
    }>(req)

    // Validate with Zod
    const validationResult = userBirthInfoUpdateSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Update birth info] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', {
        details: validationResult.error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    const { birthDate, birthTime, gender, birthCity, tzId } = validationResult.data

    // Get existing profile for cache invalidation
    const oldProfile = await prisma.userProfile.findUnique({
      where: { userId: context.userId! },
      select: { birthDate: true, birthTime: true, gender: true },
    })

    // Update or create user profile
    const profile = await prisma.userProfile.upsert({
      where: { userId: context.userId! },
      create: {
        userId: context.userId!,
        birthDate: birthDate ?? null,
        birthTime: birthTime ?? null,
        gender: gender ?? null,
        birthCity: birthCity ?? null,
        tzId: tzId ?? null,
      },
      update: {
        birthDate: birthDate ?? null,
        birthTime: birthTime ?? null,
        gender: gender ?? null,
        birthCity: birthCity ?? null,
        tzId: tzId ?? null,
      },
      select: {
        userId: true,
        birthDate: true,
        birthTime: true,
        gender: true,
        birthCity: true,
        tzId: true,
      },
    })

    // Invalidate cache if birth info changed
    const birthChanged =
      oldProfile?.birthDate !== birthDate ||
      oldProfile?.birthTime !== (birthTime ?? null) ||
      oldProfile?.gender !== (gender ?? null)

    let cacheCleared = false
    if (birthChanged && oldProfile) {
      await invalidateBirthCaches(context.userId!, oldProfile.birthDate)
      cacheCleared = true
    }

    // Return flattened response for backward compatibility
    const user = {
      id: context.userId!,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      gender: profile.gender,
      birthCity: profile.birthCity,
      tzId: profile.tzId,
    }

    return apiSuccess({ ok: true, user, cacheCleared })
  },
  createAuthenticatedGuard({ route: 'user/update-birth-info', limit: 10 })
)

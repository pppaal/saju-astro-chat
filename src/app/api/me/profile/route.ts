import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { clearCacheByPattern, CacheInvalidationPatterns } from '@/lib/cache/redis-cache'
import { userProfileUpdateSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'

// 프로필 조회 select — birthTimeUnknown 은 아래 fetchUserWithProfile 이 내성
// 처리하려고 별도로 뺐다.
const PROFILE_CORE_SELECT = {
  profilePhoto: true,
  birthDate: true,
  birthTime: true,
  gender: true,
  birthCity: true,
  latitude: true,
  longitude: true,
  tzId: true,
} as const
const USER_CORE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  createdAt: true,
} as const

/**
 * user+profile 조회에 birthTimeUnknown 컬럼 드리프트 내성을 준다. 그 컬럼이
 * prod DB 에서 누락(마이그레이션 phantom-apply)되면 select 가 Prisma P2022 로
 * 죽어 프로필 조회·저장-후-재조회가 전부 500 났다(2026-07 Sentry). 컬럼이 있으면
 * 그대로 읽고, 없으면 그 컬럼만 빼고 재조회한 뒤 birthTimeUnknown=null 로 채운다.
 * (컬럼은 vercel-build 의 prisma-schema-verify 가 재생성하지만, 그 사이·그게
 * 실패해도 프로필 화면과 저장이 살아있게 하는 방어.)
 */
async function fetchUserWithProfile(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_CORE_SELECT,
        profile: { select: { ...PROFILE_CORE_SELECT, birthTimeUnknown: true } },
      },
    })
  } catch (err) {
    if ((err as { code?: string })?.code !== 'P2022') throw err
    logger.warn('[me/profile] birthTimeUnknown column missing on read — falling back', {
      code: (err as { code?: string })?.code,
    })
    const fallback = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...USER_CORE_SELECT, profile: { select: PROFILE_CORE_SELECT } },
    })
    if (fallback?.profile) {
      ;(fallback.profile as Record<string, unknown>).birthTimeUnknown = null
    }
    return fallback as
      | (typeof fallback & {
          profile: (typeof PROFILE_CORE_SELECT & { birthTimeUnknown: null }) | null
        })
      | null
  }
}

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const user = await fetchUserWithProfile(context.userId!)

    if (!user) {
      return createErrorResponse({
        code: ErrorCodes.NOT_FOUND,
        message: 'User not found',
        locale: extractLocale(req),
        route: 'me/profile',
      })
    }

    // Flatten profile for backward compatibility
    const flattenedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      profilePhoto: user.profile?.profilePhoto ?? null,
      birthDate: user.profile?.birthDate ?? null,
      birthTime: user.profile?.birthTime ?? null,
      // null = 플래그 미보존 레거시 — 소비처는 '00:00'=미상 휴리스틱으로 폴백.
      birthTimeUnknown: user.profile?.birthTimeUnknown ?? null,
      gender: user.profile?.gender ?? null,
      birthCity: user.profile?.birthCity ?? null,
      latitude: user.profile?.latitude ?? null,
      longitude: user.profile?.longitude ?? null,
      tzId: user.profile?.tzId ?? null,
    }

    return NextResponse.json({ user: flattenedUser })
  },
  createAuthenticatedGuard({
    route: '/api/me/profile',
    limit: 120,
    windowSeconds: 60,
  })
)

export const PATCH = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json().catch(() => ({}))

    // Validate with Zod
    const validationResult = userProfileUpdateSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[User profile update] validation failed', {
        errors: validationResult.error.issues,
      })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(request),
        route: 'me/profile',
      })
    }

    const body = validationResult.data
    const userData: Record<string, unknown> = {}
    const profileData: Record<string, unknown> = {}

    // Map validated data to respective models
    if (body.name) userData.name = body.name
    if (body.image !== undefined) userData.image = body.image

    // Birth info fields (Profile model)
    const birthDate = body.birthDate
    const birthTime = body.birthTime
    const gender = body.gender
    const hasBirthFields =
      birthDate !== undefined || birthTime !== undefined || gender !== undefined

    if (birthDate !== undefined) profileData.birthDate = birthDate
    if (birthTime !== undefined) profileData.birthTime = birthTime
    // 시각 미상 명시 플래그 — birthTime 과 함께 저장해야 '00:00'(실제 자정)과
    // "시간 모름"이 구분된다. null 은 플래그 제거(레거시 휴리스틱 복귀).
    // 단, 이 컬럼은 *핵심* birthDate 와 같은 upsert 에 넣지 않고 아래에서 별도
    // best-effort 로 쓴다 — prod DB 에서 birthTimeUnknown 컬럼이 누락(마이그레이션
    // phantom-apply)되면 P2022 로 트랜잭션이 통째로 롤백돼 birthDate 저장까지
    // 막히던 사고 방지(2026-07 Sentry). 핵심 출생정보는 항상 저장되게 한다.
    const birthTimeUnknown = body.birthTimeUnknown
    if (gender !== undefined) profileData.gender = gender
    if (body.birthCity !== undefined) profileData.birthCity = body.birthCity
    // 진태양시(진경도) 보정용 출생지 좌표 — 사주·점성이 화면 간 일관되게
    // 같은 좌표를 쓰도록 영구 저장. 도시 자동완성에서 선택 시 클라가 채워 보냄.
    if (body.latitude !== undefined) profileData.latitude = body.latitude
    if (body.longitude !== undefined) profileData.longitude = body.longitude
    if (body.tzId !== undefined) profileData.tzId = body.tzId

    // Wrap the two writes so a second concurrent PATCH on the same user
    // can't interleave (e.g. one request changing the name while another
    // changes birthDate would otherwise produce a half-updated row pair
    // that the subsequent findUnique then reads).
    if (Object.keys(userData).length > 0 || Object.keys(profileData).length > 0) {
      await prisma.$transaction(async (tx) => {
        if (Object.keys(userData).length > 0) {
          await tx.user.update({
            where: { id: context.userId! },
            data: userData,
          })
        }
        if (Object.keys(profileData).length > 0) {
          await tx.userProfile.upsert({
            where: { userId: context.userId! },
            create: { userId: context.userId!, ...profileData },
            update: profileData,
          })
        }
      })
    }

    // birthTimeUnknown 은 핵심 저장이 커밋된 뒤 별도 best-effort 로 쓴다. 컬럼이
    // 누락된 드리프트 DB 에서 P2022 가 나도 위 birthDate 저장은 이미 커밋됐으니
    // 500 대신 경고만 남기고 넘어간다(비핵심 플래그가 핵심 저장을 막지 않게).
    if (birthTimeUnknown !== undefined) {
      try {
        await prisma.userProfile.upsert({
          where: { userId: context.userId! },
          create: { userId: context.userId!, birthTimeUnknown },
          update: { birthTimeUnknown },
        })
      } catch (err) {
        logger.warn('[me/profile] birthTimeUnknown write skipped (likely column drift)', {
          code: (err as { code?: string })?.code,
        })
      }
    }

    // Fetch updated user with relations — birthTimeUnknown 컬럼 드리프트 내성.
    // 이게 없으면 위 write 가 성공해도 이 재조회가 P2022 로 죽어 500 → 사용자는
    // 저장됐는데도 "저장 실패" 를 본다.
    const updatedUser = await fetchUserWithProfile(context.userId!)

    // Invalidate user-specific caches on any profile update
    if (context.userId) {
      clearCacheByPattern(`user:${context.userId}:*`).catch((err) => {
        logger.warn(`[profile PATCH] User cache invalidation failed:`, err)
      })
    }

    // Invalidate birth-related caches if birth info changed
    if (hasBirthFields) {
      // Compare old vs new values from the update body
      const currentBirthDate = updatedUser?.profile?.birthDate
      const oldBirthDate = body.birthDate !== undefined ? null : currentBirthDate
      const birthChanged =
        hasBirthFields &&
        (birthDate !== undefined || birthTime !== undefined || gender !== undefined)

      if (birthChanged) {
        const dateToInvalidate = oldBirthDate || currentBirthDate
        if (dateToInvalidate) {
          // Patterns MUST match the real key formats generated by CacheKeys
          // (saju:v1:..., destiny:v1:..., yearly:v6:..., cal:v1:year:month:userId).
          // See CacheInvalidationPatterns in @/lib/cache/redis-cache for the
          // single source of truth — keep versions in sync there.
          const patterns: string[] = [
            CacheInvalidationPatterns.sajuByBirthDate(dateToInvalidate),
            CacheInvalidationPatterns.destinyByBirthDate(dateToInvalidate),
            CacheInvalidationPatterns.yearlyByBirthDate(dateToInvalidate),
          ]
          if (context.userId) {
            patterns.push(CacheInvalidationPatterns.calendarByUser(context.userId))
          }
          Promise.all(patterns.map((p) => clearCacheByPattern(p))).catch((err) => {
            logger.warn(`[profile PATCH] Cache invalidation failed:`, err)
          })
          logger.info(`[profile PATCH] Invalidated birth caches for user ${context.userId}`)
        }
      }
    }

    // Flatten for backward compatibility
    const flattenedUser = updatedUser
      ? {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          image: updatedUser.image,
          createdAt: updatedUser.createdAt,
          profilePhoto: updatedUser.profile?.profilePhoto ?? null,
          birthDate: updatedUser.profile?.birthDate ?? null,
          birthTime: updatedUser.profile?.birthTime ?? null,
          birthTimeUnknown: updatedUser.profile?.birthTimeUnknown ?? null,
          gender: updatedUser.profile?.gender ?? null,
          birthCity: updatedUser.profile?.birthCity ?? null,
          latitude: updatedUser.profile?.latitude ?? null,
          longitude: updatedUser.profile?.longitude ?? null,
          tzId: updatedUser.profile?.tzId ?? null,
        }
      : null

    return NextResponse.json({ user: flattenedUser })
  },
  createAuthenticatedGuard({
    route: '/api/me/profile',
    limit: 60,
    windowSeconds: 60,
  })
)

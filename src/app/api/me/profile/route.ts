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

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const user = await prisma.user.findUnique({
      where: { id: context.userId! },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        profile: {
          select: {
            profilePhoto: true,
            birthDate: true,
            birthTime: true,
            gender: true,
            birthCity: true,
            latitude: true,
            longitude: true,
            tzId: true,
          },
        },
      },
    })

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

    // Fetch updated user with relations
    const updatedUser = await prisma.user.findUnique({
      where: { id: context.userId! },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        profile: {
          select: {
            profilePhoto: true,
            birthDate: true,
            birthTime: true,
            gender: true,
            birthCity: true,
            latitude: true,
            longitude: true,
            tzId: true,
          },
        },
      },
    })

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
    const flattenedUser = updatedUser ? {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
      createdAt: updatedUser.createdAt,
      profilePhoto: updatedUser.profile?.profilePhoto ?? null,
      birthDate: updatedUser.profile?.birthDate ?? null,
      birthTime: updatedUser.profile?.birthTime ?? null,
      gender: updatedUser.profile?.gender ?? null,
      birthCity: updatedUser.profile?.birthCity ?? null,
      latitude: updatedUser.profile?.latitude ?? null,
      longitude: updatedUser.profile?.longitude ?? null,
      tzId: updatedUser.profile?.tzId ?? null,
    } : null

    return NextResponse.json({ user: flattenedUser })
  },
  createAuthenticatedGuard({
    route: '/api/me/profile',
    limit: 60,
    windowSeconds: 60,
  })
)

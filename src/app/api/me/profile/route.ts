import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { clearCacheByPattern } from '@/lib/cache/redis-cache'
import { HTTP_STATUS } from '@/lib/constants/http'
import { userProfileUpdateSchema } from '@/lib/api/zodValidation'

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const user = await prisma.user.findUnique({
      where: { id: context.userId! },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        profilePhoto: true,
        birthDate: true,
        birthTime: true,
        gender: true,
        birthCity: true,
        tzId: true,
        createdAt: true,
        emailNotifications: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: HTTP_STATUS.NOT_FOUND })
    }

    return NextResponse.json({ user })
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
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const body = validationResult.data
    const data: Record<string, unknown> = {}

    // Map validated data
    if (body.name) data.name = body.name
    if (body.emailNotifications !== undefined) data.emailNotifications = body.emailNotifications
    if (body.image !== undefined) data.image = body.image
    if (body.preferredLanguage) data.preferredLanguage = body.preferredLanguage
    if (body.notificationSettings) data.notificationSettings = body.notificationSettings
    if (body.tonePreference) data.tonePreference = body.tonePreference
    if (body.readingLength) data.readingLength = body.readingLength

    // Birth info fields
    const birthDate = body.birthDate
    const birthTime = body.birthTime
    const gender = body.gender
    const hasBirthFields =
      birthDate !== undefined || birthTime !== undefined || gender !== undefined

    if (birthDate !== undefined) data.birthDate = birthDate
    if (birthTime !== undefined) data.birthTime = birthTime
    if (gender !== undefined) data.gender = gender
    if (body.birthCity !== undefined) data.birthCity = body.birthCity
    if (body.tzId !== undefined) data.tzId = body.tzId

    // Update user and fetch old + new data in single query
    const updatedUser = await prisma.user.update({
      where: { id: context.userId! },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        profilePhoto: true,
        birthDate: true,
        birthTime: true,
        gender: true,
        birthCity: true,
        tzId: true,
        createdAt: true,
        emailNotifications: true,
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
      const oldBirthDate = body.birthDate !== undefined ? null : updatedUser.birthDate
      const birthChanged =
        hasBirthFields &&
        (birthDate !== undefined || birthTime !== undefined || gender !== undefined)

      if (birthChanged) {
        const dateToInvalidate = oldBirthDate || updatedUser.birthDate
        if (dateToInvalidate) {
          const patterns: string[] = [
            `saju:${dateToInvalidate}:*`,
            `destiny:${dateToInvalidate}:*`,
            `yearly:v2:${dateToInvalidate}:*`,
          ]
          // User-specific cache: use exact key instead of wildcard scan
          if (context.userId) {
            patterns.push(`cal:user:${context.userId}`)
          }
          Promise.all(patterns.map((p) => clearCacheByPattern(p))).catch((err) => {
            logger.warn(`[profile PATCH] Cache invalidation failed:`, err)
          })
          logger.info(`[profile PATCH] Invalidated birth caches for user ${context.userId}`)
        }
      }
    }

    // Upsert user preferences if any preference fields provided
    // TEMPORARILY DISABLED: Preferences table may not be synced in production
    // const hasPrefs =
    //   isNonEmptyString(preferredLanguage, 8) ||
    //   notificationSettings ||
    //   isNonEmptyString(tonePreference, 32) ||
    //   isNonEmptyString(readingLength, 32)

    // if (hasPrefs) {
    //   await prisma.userPreferences.upsert({
    //     where: { userId: context.userId! },
    //     update: {
    //       ...(isNonEmptyString(preferredLanguage, 8) && {
    //         preferredLanguage: preferredLanguage.trim(),
    //       }),
    //       ...(notificationSettings && { notificationSettings }),
    //       ...(isNonEmptyString(tonePreference, 32) && { tonePreference: tonePreference.trim() }),
    //       ...(isNonEmptyString(readingLength, 32) && { readingLength: readingLength.trim() }),
    //     },
    //     create: {
    //       userId: context.userId!,
    //       preferredLanguage: isNonEmptyString(preferredLanguage, 8)
    //         ? preferredLanguage.trim()
    //         : 'en',
    //       notificationSettings: notificationSettings || null,
    //       tonePreference: isNonEmptyString(tonePreference, 32) ? tonePreference.trim() : 'casual',
    //       readingLength: isNonEmptyString(readingLength, 32) ? readingLength.trim() : 'medium',
    //     },
    //   })

    //   // Refresh preferences in response
    //   const freshPrefs = await prisma.userPreferences.findUnique({
    //     where: { userId: context.userId! },
    //     select: {
    //       preferredLanguage: true,
    //       notificationSettings: true,
    //       tonePreference: true,
    //       readingLength: true,
    //     },
    //   })
    //   updatedUser.preferences = freshPrefs
    // }

    return NextResponse.json({ user: updatedUser })
  },
  createAuthenticatedGuard({
    route: '/api/me/profile',
    limit: 60,
    windowSeconds: 60,
  })
)

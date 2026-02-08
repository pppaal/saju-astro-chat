import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { clearCacheByPattern } from '@/lib/cache/redis-cache'
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
            tzId: true,
          },
        },
        settings: {
          select: {
            emailNotifications: true,
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

    // Flatten profile and settings for backward compatibility
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
      tzId: user.profile?.tzId ?? null,
      emailNotifications: user.settings?.emailNotifications ?? false,
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
    const settingsData: Record<string, unknown> = {}

    // Map validated data to respective models
    if (body.name) userData.name = body.name
    if (body.image !== undefined) userData.image = body.image

    // Settings fields
    if (body.emailNotifications !== undefined) settingsData.emailNotifications = body.emailNotifications

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
    if (body.tzId !== undefined) profileData.tzId = body.tzId

    // Update user
    if (Object.keys(userData).length > 0) {
      await prisma.user.update({
        where: { id: context.userId! },
        data: userData,
      })
    }

    // Update or create profile if needed
    if (Object.keys(profileData).length > 0) {
      await prisma.userProfile.upsert({
        where: { userId: context.userId! },
        create: { userId: context.userId!, ...profileData },
        update: profileData,
      })
    }

    // Update or create settings if needed
    if (Object.keys(settingsData).length > 0) {
      await prisma.userSettings.upsert({
        where: { userId: context.userId! },
        create: { userId: context.userId!, ...settingsData },
        update: settingsData,
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
            tzId: true,
          },
        },
        settings: {
          select: {
            emailNotifications: true,
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
      tzId: updatedUser.profile?.tzId ?? null,
      emailNotifications: updatedUser.settings?.emailNotifications ?? false,
    } : null

    return NextResponse.json({ user: flattenedUser })
  },
  createAuthenticatedGuard({
    route: '/api/me/profile',
    limit: 60,
    windowSeconds: 60,
  })
)

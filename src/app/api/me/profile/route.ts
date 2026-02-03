import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { clearCacheByPattern } from '@/lib/cache/redis-cache'
import { HTTP_STATUS } from '@/lib/constants/http'
const isNonEmptyString = (val: unknown, max = 120) =>
  typeof val === 'string' && val.trim().length > 0 && val.trim().length <= max

const isValidUrl = (val: unknown) => {
  if (typeof val !== 'string' || !val.trim()) {
    return false
  }
  try {
    const url = new URL(val)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

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
        preferences: {
          select: {
            preferredLanguage: true,
            notificationSettings: true,
            tonePreference: true,
            readingLength: true,
          },
        },
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
    const body = await request.json().catch(() => ({}))
    const {
      name,
      image,
      emailNotifications,
      preferredLanguage,
      notificationSettings,
      tonePreference,
      readingLength,
      birthDate,
      birthTime,
      gender,
      birthCity,
      tzId,
    } = body || {}

    const data: Record<string, unknown> = {}
    if (isNonEmptyString(name, 64)) {
      data.name = name.trim()
    }
    if (typeof emailNotifications === 'boolean') {
      data.emailNotifications = emailNotifications
    }
    if (image === null) {
      data.image = null
    } else if (isValidUrl(image)) {
      data.image = image.trim()
    }

    // Birth info fields
    const hasBirthFields =
      birthDate !== undefined ||
      birthTime !== undefined ||
      gender !== undefined ||
      birthCity !== undefined ||
      tzId !== undefined
    if (hasBirthFields) {
      if (birthDate !== undefined) data.birthDate = typeof birthDate === 'string' ? birthDate : null
      if (birthTime !== undefined) data.birthTime = typeof birthTime === 'string' ? birthTime : null
      if (gender !== undefined) data.gender = typeof gender === 'string' ? gender : null
      if (birthCity !== undefined) data.birthCity = typeof birthCity === 'string' ? birthCity : null
      if (tzId !== undefined) data.tzId = typeof tzId === 'string' ? tzId : null
    }

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
        preferences: {
          select: {
            preferredLanguage: true,
            notificationSettings: true,
            tonePreference: true,
            readingLength: true,
          },
        },
      },
    })

    // Invalidate birth-related caches if birth info changed
    if (hasBirthFields) {
      // Compare old vs new values from the update body
      const oldBirthDate = body.birthDate !== undefined ? null : updatedUser.birthDate
      const birthChanged =
        hasBirthFields &&
        (birthDate !== undefined || birthTime !== undefined || gender !== undefined)

      if (birthChanged && oldBirthDate) {
        const patterns: string[] = [
          `saju:${oldBirthDate}:*`,
          `destiny:${oldBirthDate}:*`,
          `yearly:v2:${oldBirthDate}:*`,
          `cal:*:*:${context.userId}`,
        ]
        await Promise.all(patterns.map((p) => clearCacheByPattern(p)))
        logger.info(`[profile PATCH] Invalidated birth caches for user ${context.userId}`)
      }
    }

    // Upsert user preferences if any preference fields provided
    const hasPrefs =
      isNonEmptyString(preferredLanguage, 8) ||
      notificationSettings ||
      isNonEmptyString(tonePreference, 32) ||
      isNonEmptyString(readingLength, 32)

    if (hasPrefs) {
      await prisma.userPreferences.upsert({
        where: { userId: context.userId! },
        update: {
          ...(isNonEmptyString(preferredLanguage, 8) && {
            preferredLanguage: preferredLanguage.trim(),
          }),
          ...(notificationSettings && { notificationSettings }),
          ...(isNonEmptyString(tonePreference, 32) && { tonePreference: tonePreference.trim() }),
          ...(isNonEmptyString(readingLength, 32) && { readingLength: readingLength.trim() }),
        },
        create: {
          userId: context.userId!,
          preferredLanguage: isNonEmptyString(preferredLanguage, 8)
            ? preferredLanguage.trim()
            : 'en',
          notificationSettings: notificationSettings || null,
          tonePreference: isNonEmptyString(tonePreference, 32) ? tonePreference.trim() : 'casual',
          readingLength: isNonEmptyString(readingLength, 32) ? readingLength.trim() : 'medium',
        },
      })

      // Refresh preferences in response
      const freshPrefs = await prisma.userPreferences.findUnique({
        where: { userId: context.userId! },
        select: {
          preferredLanguage: true,
          notificationSettings: true,
          tonePreference: true,
          readingLength: true,
        },
      })
      updatedUser.preferences = freshPrefs
    }

    return NextResponse.json({ user: updatedUser })
  },
  createAuthenticatedGuard({
    route: '/api/me/profile',
    limit: 60,
    windowSeconds: 60,
  })
)

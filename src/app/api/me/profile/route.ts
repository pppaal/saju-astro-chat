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
    const url = new URL(val);
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

    // Get old birth info for cache invalidation (only if birth fields are being updated)
    let oldUser: {
      birthDate: string | null
      birthTime: string | null
      gender: string | null
    } | null = null
    if (hasBirthFields) {
      oldUser = await prisma.user.findUnique({
        where: { id: context.userId! },
        select: { birthDate: true, birthTime: true, gender: true },
      })
    }

    await prisma.user.update({
      where: { id: context.userId! },
      data,
      select: { id: true },
    })

    // Invalidate birth-related caches if birth info changed
    if (hasBirthFields && oldUser) {
      const birthChanged =
        oldUser.birthDate !== (data.birthDate ?? oldUser.birthDate) ||
        oldUser.birthTime !== (data.birthTime ?? oldUser.birthTime) ||
        oldUser.gender !== (data.gender ?? oldUser.gender)

      if (birthChanged) {
        const patterns: string[] = []
        if (oldUser.birthDate) {
          patterns.push(`saju:${oldUser.birthDate}:*`)
          patterns.push(`destiny:${oldUser.birthDate}:*`)
          patterns.push(`yearly:v2:${oldUser.birthDate}:*`)
        }
        patterns.push(`cal:*:*:${context.userId}`)
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
    }

    // Re-fetch full profile to return
    const fullUser = await prisma.user.findUnique({
      where: { id: context.userId! },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
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
    });

    return NextResponse.json({ user: fullUser })
  },
  createAuthenticatedGuard({
    route: '/api/me/profile',
    limit: 60,
    windowSeconds: 60,
  })
)

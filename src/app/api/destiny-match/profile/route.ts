/**
 * Destiny Match Profile API
 * 매칭 프로필 CRUD
 */
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { HTTP_STATUS } from '@/lib/constants/http'
import { logger } from '@/lib/logger'
import { destinyMatchProfileSchema } from '@/lib/api/zodValidation'

// GET - 내 프로필 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const profile = await prisma.matchProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            birthDate: true,
            birthTime: true,
            birthCity: true,
            gender: true,
            image: true,
          },
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ profile: null, needsSetup: true })
    }

    return NextResponse.json({ profile, needsSetup: false })
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/profile',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST - 프로필 생성/업데이트
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const rawBody = await req.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Validate with Zod
    const validationResult = destinyMatchProfileSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Destiny match profile] validation failed', {
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

    const {
      displayName,
      bio,
      occupation,
      photos,
      city,
      latitude,
      longitude,
      interests,
      ageMin,
      ageMax,
      maxDistance,
      genderPreference,
      isActive,
      isVisible,
    } = validationResult.data

    // 기존 프로필 확인
    const existingProfile = await prisma.matchProfile.findUnique({
      where: { userId },
    })

    // 성격 테스트 결과 조회 (자동 연동)
    const personalityResult = await prisma.personalityResult.findUnique({
      where: { userId },
      select: {
        typeCode: true,
        personaName: true,
        energyScore: true,
        cognitionScore: true,
        decisionScore: true,
        rhythmScore: true,
      },
    })

    const profileData = {
      displayName: displayName.trim(),
      bio: bio?.trim() || null,
      occupation: occupation?.trim() || null,
      photos: photos || [],
      city: city?.trim() || null,
      latitude: latitude || null,
      longitude: longitude || null,
      interests: interests || [],
      ageMin: ageMin ?? 18,
      ageMax: ageMax ?? 99,
      maxDistance: maxDistance ?? 50,
      genderPreference: genderPreference || 'all',
      isActive: isActive ?? true,
      isVisible: isVisible ?? true,
      lastActiveAt: new Date(),
      // 성격 테스트 결과 자동 연동
      ...(personalityResult && {
        personalityType: personalityResult.typeCode,
        personalityName: personalityResult.personaName,
        personalityScores: {
          energy: personalityResult.energyScore,
          cognition: personalityResult.cognitionScore,
          decision: personalityResult.decisionScore,
          rhythm: personalityResult.rhythmScore,
        },
      }),
    }

    let profile
    if (existingProfile) {
      // 업데이트
      profile = await prisma.matchProfile.update({
        where: { userId },
        data: profileData,
      })
    } else {
      // 생성
      profile = await prisma.matchProfile.create({
        data: {
          userId,
          ...profileData,
        },
      })
    }

    return NextResponse.json({ profile, success: true })
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/profile',
    limit: 30,
    windowSeconds: 60,
  })
)

// DELETE - 프로필 비활성화 (완전 삭제 아님)
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    await prisma.matchProfile.update({
      where: { userId },
      data: {
        isActive: false,
        isVisible: false,
      },
    })

    return NextResponse.json({ success: true })
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/profile',
    limit: 30,
    windowSeconds: 60,
  })
)

/**
 * Destiny Match Profile API
 * 매칭 프로필 CRUD
 */
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'

// GET - 내 프로필 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
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
    } catch (error) {
      logger.error('[destiny-match/profile] GET error:', { error: error })
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
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
    try {
      const userId = context.userId!

      const body = await req.json()
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
      } = body

      // 필수 필드 검증
      if (!displayName || displayName.trim().length < 2) {
        return NextResponse.json(
          { error: '표시 이름은 2자 이상이어야 합니다' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      // 입력값 타입 및 범위 검증
      if (
        latitude !== undefined &&
        (typeof latitude !== 'number' || latitude < -90 || latitude > 90)
      ) {
        return NextResponse.json(
          { error: 'Invalid latitude value' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
      if (
        longitude !== undefined &&
        (typeof longitude !== 'number' || longitude < -180 || longitude > 180)
      ) {
        return NextResponse.json(
          { error: 'Invalid longitude value' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
      if (photos !== undefined && (!Array.isArray(photos) || photos.length > 10)) {
        return NextResponse.json(
          { error: 'Photos must be an array with max 10 items' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
      if (ageMin !== undefined && (typeof ageMin !== 'number' || ageMin < 18 || ageMin > 100)) {
        return NextResponse.json(
          { error: 'Invalid ageMin value' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
      if (ageMax !== undefined && (typeof ageMax !== 'number' || ageMax < 18 || ageMax > 100)) {
        return NextResponse.json(
          { error: 'Invalid ageMax value' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
      if (
        maxDistance !== undefined &&
        (typeof maxDistance !== 'number' || maxDistance < 1 || maxDistance > 500)
      ) {
        return NextResponse.json(
          { error: 'Invalid maxDistance value' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

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
    } catch (error) {
      logger.error('[destiny-match/profile] POST error:', { error: error })
      return NextResponse.json(
        { error: 'Failed to save profile' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
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
    try {
      const userId = context.userId!

      await prisma.matchProfile.update({
        where: { userId },
        data: {
          isActive: false,
          isVisible: false,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      logger.error('[destiny-match/profile] DELETE error:', { error: error })
      return NextResponse.json(
        { error: 'Failed to deactivate profile' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/profile',
    limit: 30,
    windowSeconds: 60,
  })
)

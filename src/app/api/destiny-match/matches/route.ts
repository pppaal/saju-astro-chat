/**
 * Destiny Match Matches API
 * 매치된 사용자 목록 조회
 */
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { HTTP_STATUS } from '@/lib/constants/http'
import { destinyMatchUnmatchSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

// GET - 내 매치 목록 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') || 'active'
    const connectionId = searchParams.get('connectionId')

    // 내 프로필 조회
    const myProfile = await prisma.matchProfile.findUnique({
      where: { userId },
    })

    if (!myProfile) {
      return NextResponse.json(
        { error: '먼저 매칭 프로필을 설정해주세요' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // 특정 connectionId로 조회하거나 전체 조회
    const whereClause = connectionId
      ? {
          id: connectionId,
          status,
          OR: [{ user1Id: myProfile.id }, { user2Id: myProfile.id }],
        }
      : {
          status,
          OR: [{ user1Id: myProfile.id }, { user2Id: myProfile.id }],
        }

    // 내 매치 조회 (user1 또는 user2로 연결된 것)
    const connections = await prisma.matchConnection.findMany({
      where: whereClause,
      include: {
        user1Profile: {
          include: {
            user: {
              select: {
                birthDate: true,
                gender: true,
                image: true,
              },
            },
          },
        },
        user2Profile: {
          include: {
            user: {
              select: {
                birthDate: true,
                gender: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 상대방 프로필 정보로 변환
    const matches = connections.map((conn) => {
      const isUser1 = conn.user1Id === myProfile.id
      const partnerProfile = isUser1 ? conn.user2Profile : conn.user1Profile

      // 나이 계산
      let age: number | null = null
      if (partnerProfile.user.birthDate) {
        const birth = new Date(partnerProfile.user.birthDate)
        const today = new Date()
        age = today.getFullYear() - birth.getFullYear()
        const monthDiff = today.getMonth() - birth.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--
        }
      }

      // 상세 궁합 데이터 파싱
      const compatibilityData = conn.compatibilityData as {
        score?: number
        grade?: string
        strengths?: string[]
        challenges?: string[]
        advice?: string
        dayMasterRelation?: string
        elementHarmony?: string[]
        recommendations?: string[]
      } | null

      return {
        connectionId: conn.id,
        matchedAt: conn.createdAt,
        isSuperLikeMatch: conn.isSuperLikeMatch,
        compatibilityScore: conn.compatibilityScore,
        // 상세 궁합 정보
        compatibilityDetails: compatibilityData
          ? {
              grade: compatibilityData.grade,
              strengths: compatibilityData.strengths,
              challenges: compatibilityData.challenges,
              advice: compatibilityData.advice,
              dayMasterRelation: compatibilityData.dayMasterRelation,
              elementHarmony: compatibilityData.elementHarmony,
              recommendations: compatibilityData.recommendations,
            }
          : null,
        chatStarted: conn.chatStarted,
        lastInteractionAt: conn.lastInteractionAt,
        partner: {
          profileId: partnerProfile.id,
          userId: partnerProfile.userId,
          displayName: partnerProfile.displayName,
          bio: partnerProfile.bio,
          occupation: partnerProfile.occupation,
          photos: partnerProfile.photos,
          city: partnerProfile.city,
          interests: partnerProfile.interests,
          verified: partnerProfile.verified,
          age,
          lastActiveAt: partnerProfile.lastActiveAt,
          personalityType: partnerProfile.personalityType,
          personalityName: partnerProfile.personalityName,
        },
      }
    })

    return NextResponse.json({ matches, total: matches.length })
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/matches',
    limit: 60,
    windowSeconds: 60,
  })
)

// DELETE - 매치 해제 (unmatch)
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const rawBody = await req.json()
    const validationResult = destinyMatchUnmatchSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[destiny-match/matches] DELETE validation failed', {
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
    const { connectionId } = validationResult.data

    // 내 프로필 조회
    const myProfile = await prisma.matchProfile.findUnique({
      where: { userId },
    })

    if (!myProfile) {
      return NextResponse.json(
        { error: '먼저 매칭 프로필을 설정해주세요' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // 연결 조회 및 권한 확인
    const connection = await prisma.matchConnection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      return NextResponse.json(
        { error: '매치를 찾을 수 없습니다' },
        { status: HTTP_STATUS.NOT_FOUND }
      )
    }

    if (connection.user1Id !== myProfile.id && connection.user2Id !== myProfile.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: HTTP_STATUS.FORBIDDEN })
    }

    // 매치 상태를 unmatched로 변경
    await prisma.matchConnection.update({
      where: { id: connectionId },
      data: { status: 'unmatched' },
    })

    // 양쪽 matchCount 감소 - 배치 쿼리로 최적화 (N+1 방지)
    // matchCount가 0 이하로 내려가지 않도록 조건부 업데이트
    await prisma.$transaction([
      prisma.matchProfile.updateMany({
        where: {
          id: connection.user1Id,
          matchCount: { gt: 0 },
        },
        data: { matchCount: { decrement: 1 } },
      }),
      prisma.matchProfile.updateMany({
        where: {
          id: connection.user2Id,
          matchCount: { gt: 0 },
        },
        data: { matchCount: { decrement: 1 } },
      }),
    ])

    return NextResponse.json({ success: true })
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/matches',
    limit: 30,
    windowSeconds: 60,
  })
)

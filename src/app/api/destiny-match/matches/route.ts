/**
 * Destiny Match Matches API
 * 매치된 사용자 목록 조회
 */
import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { destinyMatchUnmatchSchema, destinyMatchMatchesQuerySchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

// GET - 내 매치 목록 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const queryValidation = destinyMatchMatchesQuerySchema.safeParse({
      status: searchParams.get('status') || undefined,
      connectionId: searchParams.get('connectionId') || undefined,
    })
    if (!queryValidation.success) {
      logger.warn('[destiny-match/matches GET] query validation failed', {
        errors: queryValidation.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${queryValidation.error.issues.map((e) => e.message).join(', ')}`
      )
    }
    const { status, connectionId } = queryValidation.data

    try {
      // 내 프로필 조회
      const myProfile = await prisma.matchProfile.findUnique({
        where: { userId },
      })

      if (!myProfile) {
        return apiError(ErrorCodes.BAD_REQUEST, '먼저 매칭 프로필을 설정해주세요')
      }

      // 특정 connectionId로 조회하거나 전체 조회
      const statusFilter = status === 'all' ? {} : { status }
      const whereClause = {
        ...(connectionId ? { id: connectionId } : {}),
        ...statusFilter,
        OR: [{ user1Id: myProfile.id }, { user2Id: myProfile.id }],
      }

      // 내 매치 조회 (user1 또는 user2로 연결된 것)
      // select() instead of include() to fetch only needed columns
      const connections = await prisma.matchConnection.findMany({
        where: whereClause,
        select: {
          id: true,
          createdAt: true,
          isSuperLikeMatch: true,
          compatibilityScore: true,
          compatibilityData: true,
          chatStarted: true,
          lastInteractionAt: true,
          user1Id: true,
          user2Id: true,
          user1Profile: {
            select: {
              id: true,
              userId: true,
              displayName: true,
              bio: true,
              occupation: true,
              photos: true,
              city: true,
              interests: true,
              verified: true,
              lastActiveAt: true,
              personalityType: true,
              personalityName: true,
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
            select: {
              id: true,
              userId: true,
              displayName: true,
              bio: true,
              occupation: true,
              photos: true,
              city: true,
              interests: true,
              verified: true,
              lastActiveAt: true,
              personalityType: true,
              personalityName: true,
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

      return apiSuccess({ matches, total: matches.length })
    } catch (err) {
      logger.error('[destiny-match/matches GET] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch matches')
    }
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
      logger.warn('[destiny-match/matches DELETE] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }
    const { connectionId } = validationResult.data

    try {
      // 내 프로필 조회
      const myProfile = await prisma.matchProfile.findUnique({
        where: { userId },
      })

      if (!myProfile) {
        return apiError(ErrorCodes.BAD_REQUEST, '먼저 매칭 프로필을 설정해주세요')
      }

      // 연결 조회 및 권한 확인
      const connection = await prisma.matchConnection.findUnique({
        where: { id: connectionId },
      })

      if (!connection) {
        return apiError(ErrorCodes.NOT_FOUND, '매치를 찾을 수 없습니다')
      }

      if (connection.user1Id !== myProfile.id && connection.user2Id !== myProfile.id) {
        return apiError(ErrorCodes.FORBIDDEN, '권한이 없습니다')
      }

      // 매치 상태를 unmatched로 변경
      await prisma.matchConnection.update({
        where: { id: connectionId },
        data: { status: 'unmatched' },
      })

      // 양쪽 matchCount 감소
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

      return apiSuccess({ unmatched: true })
    } catch (err) {
      logger.error('[destiny-match/matches DELETE] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to unmatch')
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/matches',
    limit: 30,
    windowSeconds: 60,
  })
)

/**
 * Destiny Match Oracle API
 * GET /api/destiny-match/oracle/[connectionId]?activity=meeting
 *
 * Returns a deterministic 3-card relationship tarot spread plus auspicious
 * date/time picks for the matched pair, anchored on "now".
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
import { logger } from '@/lib/logger'
import {
  getOracleReading,
  isRelationshipActivity,
  DEFAULT_ORACLE_ACTIVITY,
} from '@/lib/destiny-match/oracle'

type RouteContext = {
  params: Promise<{ connectionId: string }>
}

export async function GET(request: NextRequest, routeContext: RouteContext) {
  const { connectionId } = await routeContext.params
  if (!connectionId || typeof connectionId !== 'string') {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'connectionId is required')
  }

  const activityRaw = request.nextUrl.searchParams.get('activity')
  const activity = activityRaw && isRelationshipActivity(activityRaw)
    ? activityRaw
    : DEFAULT_ORACLE_ACTIVITY

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      const userId = context.userId!

      const myProfile = await prisma.matchProfile.findUnique({
        where: { userId },
        select: { id: true },
      })
      if (!myProfile) {
        return apiError(ErrorCodes.BAD_REQUEST, '먼저 매칭 프로필을 설정해주세요')
      }

      const connection = await prisma.matchConnection.findUnique({
        where: { id: connectionId },
        select: {
          id: true,
          status: true,
          user1Id: true,
          user2Id: true,
          user1Profile: {
            select: {
              user: {
                select: {
                  profile: {
                    select: { birthDate: true, birthTime: true, gender: true, tzId: true },
                  },
                },
              },
            },
          },
          user2Profile: {
            select: {
              user: {
                select: {
                  profile: {
                    select: { birthDate: true, birthTime: true, gender: true, tzId: true },
                  },
                },
              },
            },
          },
        },
      })

      if (!connection) {
        return apiError(ErrorCodes.NOT_FOUND, '매치를 찾을 수 없습니다')
      }
      if (connection.user1Id !== myProfile.id && connection.user2Id !== myProfile.id) {
        return apiError(ErrorCodes.FORBIDDEN, '이 매치에 접근 권한이 없습니다')
      }
      if (connection.status === 'blocked' || connection.status === 'unmatched') {
        return apiError(ErrorCodes.FORBIDDEN, '비활성화된 매치입니다')
      }

      const profile1 = connection.user1Profile.user.profile
      const profile2 = connection.user2Profile.user.profile
      if (!profile1?.birthDate || !profile2?.birthDate) {
        return apiError(
          ErrorCodes.BAD_REQUEST,
          '두 사람 모두 생년월일이 필요합니다',
        )
      }

      try {
        const reading = await getOracleReading({
          connectionId,
          activity,
          person1: {
            birthDate: profile1.birthDate,
            birthTime: profile1.birthTime ?? undefined,
            gender: profile1.gender ?? undefined,
            timezone: profile1.tzId ?? undefined,
          },
          person2: {
            birthDate: profile2.birthDate,
            birthTime: profile2.birthTime ?? undefined,
            gender: profile2.gender ?? undefined,
            timezone: profile2.tzId ?? undefined,
          },
        })
        return apiSuccess(reading)
      } catch (err) {
        logger.error('[oracle GET] reading failed:', { err })
        return apiError(ErrorCodes.INTERNAL_ERROR, '오라클 계산 중 오류가 발생했습니다')
      }
    },
    createAuthenticatedGuard({
      route: '/api/destiny-match/oracle',
      limit: 30,
      windowSeconds: 60,
    }),
  )

  return handler(request)
}

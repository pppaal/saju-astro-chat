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

// GET /api/me/export — return the signed-in user's own data as a single JSON
// payload so they can download it (GDPR Art.15·20 / PIPA 35조 — 열람 및
// 데이터 이동 권리).
//
// 포함 범위: 사용자가 직접 만든 자료 + 결제·동의 기록.
// - 프로필·설정 (법령 동의 timestamp 포함) + 환경 설정
// - 결제·환불·추천 보상 (회계 5년 보존 대상도 본인 데이터는 export 에 포함)
// - 현재 노출 4개 서비스 (운명 상담사·타로·궁합·운세 캘린더) 의 본인 기록
//
// 제외:
// - 인증 토큰 (Account, Session, PushSubscription) — 보안
// - 내부 분석 신호 (UserInteraction, UserDecision) — 사용자에게 의미 없는 메타데이터
// - 메뉴에서 숨긴 옛 서비스 (report·destinyMatch·ICP·PastLife 등) — 현재
//   라이브 라인업이 아님. 본인 계정에 잔존 데이터가 있다면 계정 삭제로
//   함께 제거됨 (Cascade).
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const userId = context.userId!
    try {
      const [
        profile,
        settings,
        preferences,
        circle,
        credits,
        purchases,
        refundLogs,
        referralRewards,
        // 현재 노출 4개 서비스의 본인 기록
        counselorSessions,
        tarotReadings,
        compatibilityResults,
        savedCalendarDates,
        // 트랜잭션 메일 발송 기록 (본인이 받은 메일) + 본인이 만든 공유 링크
        emailLog,
        sharedResults,
      ] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
            updatedAt: true,
            referrerId: true,
            profile: {
              select: {
                profilePhoto: true,
                birthDate: true,
                birthTime: true,
                gender: true,
                birthCity: true,
                tzId: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        }),
        // UserSettings — 법령 동의 timestamp (legalAcceptedAt/Version,
        // ageConfirmedAt) + 추천 코드. 본인 동의 기록은 PIPA 권리 행사 시 핵심.
        prisma.userSettings.findUnique({ where: { userId } }),
        prisma.userPreferences.findUnique({ where: { userId } }),
        prisma.savedPerson.findMany({ where: { userId } }),
        prisma.userCredits.findUnique({ where: { userId } }),
        prisma.bonusCreditPurchase.findMany({ where: { userId } }),
        prisma.creditRefundLog.findMany({ where: { userId } }),
        prisma.referralReward.findMany({ where: { userId } }),
        prisma.counselorChatSession.findMany({ where: { userId } }),
        prisma.tarotReading.findMany({ where: { userId } }),
        prisma.compatibilityResult.findMany({ where: { userId } }),
        prisma.savedCalendarDate.findMany({ where: { userId } }),
        prisma.emailLog.findMany({ where: { userId } }),
        prisma.sharedResult.findMany({ where: { userId } }),
      ])

      if (!profile) {
        return apiError(ErrorCodes.NOT_FOUND, 'Account not found')
      }

      return apiSuccess({
        exportedAt: new Date().toISOString(),
        formatVersion: 2,
        profile,
        settings,
        preferences,
        circle,
        credits,
        purchases,
        refundLogs,
        referralRewards,
        counselorSessions,
        tarotReadings,
        compatibilityResults,
        savedCalendarDates,
        emailLog,
        sharedResults,
      })
    } catch (err) {
      logger.error('Error exporting account data:', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/export',
    limit: 10,
    windowSeconds: 60,
  })
)

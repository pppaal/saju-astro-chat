/**
 * Admin Conversion-funnel API
 *
 * GET /api/admin/funnel?days=N
 *
 * 기간 내 가입한 코호트 기준 전환 퍼널: 가입 → 첫 리딩(사주/타로/상담) →
 * 첫 결제. 각 단계 인원과 직전 단계 대비 전환율을 반환한다.
 */

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAdminGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { adminDaysQuerySchema, formatZodErrors } from '@/lib/api/zodValidation'
// realUserWhere 는 @/lib/admin/realUser 의 단일 출처를 쓴다. 직전엔 이 파일이
// 같은 정의를 인라인 복붙해, overview·users-by 와 "회원" 정의가 드리프트할
// 위험이 있었다(셀프 환불 TOCTOU 가 복붙으로 두 군데 났던 것과 같은 부류).
import { realUserWhere } from '@/lib/admin/realUser'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      // 잘못된 days 는 silent clamp 대신 422 — 오타를 기본값으로 흡수하면
      // 운영자가 의도와 다른 기간을 보고 있는 걸 알아챌 수 없다.
      const parsedQuery = adminDaysQuerySchema.safeParse(
        Object.fromEntries(new URL(req.url).searchParams)
      )
      if (!parsedQuery.success) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          'days must be an integer between 1 and 365',
          formatZodErrors(parsedQuery.error)
        )
      }
      const { days } = parsedQuery.data
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // 코호트: 기간 내 가입한 실회원
      const cohort = await prisma.user.findMany({
        where: { AND: [realUserWhere, { createdAt: { gte: since } }] },
        select: { id: true, createdAt: true },
      })
      const ids = cohort.map((u) => u.id)
      const signupAt = new Map(cohort.map((u) => [u.id, u.createdAt]))

      let activated = 0
      let paid = 0
      let returned = 0
      if (ids.length > 0) {
        const inIds = { userId: { in: ids } }
        // Reading 모델 제거 (2026-06-06) — 활성 판정은 tarotReading +
        // counselorChatSession 만. 직전엔 코호트의 *모든* 활동 행을 메모리로
        // 로드했는데(대형 코호트·장기 윈도에서 OOM 위험), 활성/재방문 판정엔
        // 사용자별 *마지막* 활동 시각만 있으면 된다 → groupBy(userId) + _max 로
        // DB 집계해 테이블당 사용자 수만큼만 들고 온다. 재방문(리텐션): 가입 후
        // 24h 이상 지나 다시 활동한 코호트 사용자(= 마지막 활동이 가입+24h 이후).
        const [tarotAgg, counselorAgg, buyerUsers] = await Promise.all([
          prisma.tarotReading.groupBy({
            by: ['userId'],
            where: inIds,
            _max: { createdAt: true },
          }),
          prisma.counselorChatSession.groupBy({
            by: ['userId'],
            where: inIds,
            _max: { createdAt: true },
          }),
          prisma.bonusCreditPurchase.findMany({
            // 실결제 표식(stripePaymentId)이 있는 행만 — source='purchase' 는
            // addBonusCredits 기본값이라 추천·지급도 섞인다.
            where: { ...inIds, stripePaymentId: { not: null } },
            distinct: ['userId'],
            select: { userId: true },
          }),
        ])
        const RETURN_THRESHOLD_MS = 24 * 60 * 60 * 1000
        const activeSet = new Set<string>()
        // 사용자별 가장 늦은 활동 시각(두 테이블의 _max 중 더 큰 값).
        const lastActiveAt = new Map<string, number>()
        for (const g of [...tarotAgg, ...counselorAgg]) {
          activeSet.add(g.userId)
          const t = g._max.createdAt?.getTime()
          if (t === undefined) continue
          const prev = lastActiveAt.get(g.userId)
          if (prev === undefined || t > prev) lastActiveAt.set(g.userId, t)
        }
        const returnedSet = new Set<string>()
        for (const [uid, t] of lastActiveAt) {
          const signed = signupAt.get(uid)
          if (signed && t - signed.getTime() >= RETURN_THRESHOLD_MS) {
            returnedSet.add(uid)
          }
        }
        activated = activeSet.size
        returned = returnedSet.size
        paid = new Set(buyerUsers.map((b) => b.userId)).size
      }

      const signups = ids.length
      // 100 으로 clamp — 퍼널 각 단계는 직전 단계의 부분집합이어야 하지만, '첫
      // 결제'는 '첫 리딩'의 엄밀한 부분집합이 아니다(리딩 없이 크레딧만 사거나,
      // 활성으로 안 잡히는 경로로 산 사용자). 그 경우 paid/activated 가 100%를
      // 넘어 "직전 단계 대비 >100%" 라는 깨진 막대로 보였다. 비율 자체는 의미가
      // 없으니 표시상 100%로 막는다.
      const pct = (n: number, base: number) =>
        base > 0 ? Math.min(100, Math.round((n / base) * 1000) / 10) : 0

      return apiSuccess({
        rangeDays: days,
        steps: [
          { key: 'signup', label: '가입', count: signups, fromPrev: 100, fromStart: 100 },
          {
            key: 'activated',
            label: '첫 리딩',
            count: activated,
            fromPrev: pct(activated, signups),
            fromStart: pct(activated, signups),
          },
          {
            key: 'paid',
            label: '첫 결제',
            count: paid,
            fromPrev: pct(paid, activated),
            fromStart: pct(paid, signups),
          },
        ],
        // 재방문은 결제의 하위 단계가 아니라 코호트 전체 기준 리텐션 지표라
        // steps 와 분리해 별도로 반환한다(>100% 혼동 방지).
        retention: { returned, rate: pct(returned, signups) },
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/funnel] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAdminGuard({ route: '/api/admin/funnel', limit: 30, windowSeconds: 60 })
)

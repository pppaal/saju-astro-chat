/**
 * Admin Funnel Metrics API
 *
 * GET /api/admin/metrics/funnel - Get core funnel metrics
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
import { realUserWhere } from '@/lib/admin/realUser'
import { getMetricsSnapshot } from '@/lib/metrics/index'
import { DashboardTimeRangeSchema, type DashboardTimeRange } from '@/lib/metrics/schema'

/**
 * 바이럴 K(바이럴 계수) 리드아웃 — funnel.* 인메모리 카운터에서 계산.
 * K = 원참여자 1명이 만들어내는 신규 완주자 수(= invite_converted / 원노출).
 * K ≥ 1 이면 자가증식(바이럴). 단계 전환율도 같이 노출해 어디서 새는지 본다.
 *
 * 주의: recordCounter 는 프로세스-로컬 인메모리라 배포·재시작으로 리셋되고
 * 멀티 인스턴스에선 인스턴스별 값이다(교차 합산은 Prometheus 스크랩이 SSOT).
 * 따라서 여기 K 는 "이 인스턴스의 재시작 이후" 방향값 — 절대 총량 아님.
 */
function readViralFunnel(): Record<string, unknown> {
  const counters = getMetricsSnapshot().counters as Array<{ name: string; value: number }>
  const sum = (event: string): number =>
    counters.filter((c) => c.name === `funnel.${event}`).reduce((a, c) => a + (c.value || 0), 0)
  const ratio = (num: number, den: number): number =>
    den > 0 ? Math.round((num / den) * 1000) / 1000 : 0

  // 리포트 루프: 자기 리포트 노출 → 공유 클릭 → 초대 랜딩 → 초대 전환.
  const rViewed = sum('integrated_report.viewed')
  const rShare = sum('integrated_report.share_clicked')
  const rLanded = sum('integrated_report.invite_landed')
  const rConverted = sum('integrated_report.invite_converted')

  // 궁합 루프: 리포트 노출 → 공유 클릭 → 랜딩 → 프리필 → 전환.
  const cViewed = sum('compat_free.report_viewed')
  const cShare = sum('compat_free.share_clicked')
  const cLanded = sum('compat_free.invite_landed')
  const cPrefilled = sum('compat_free.invite_prefilled')
  const cConverted = sum('compat_free.invite_converted')

  return {
    report: {
      viewed: rViewed,
      shareClicked: rShare,
      inviteLanded: rLanded,
      inviteConverted: rConverted,
      shareRate: ratio(rShare, rViewed), // 노출→공유
      landRate: ratio(rLanded, rShare), // 공유→랜딩
      convertRate: ratio(rConverted, rLanded), // 랜딩→전환
      k: ratio(rConverted, rViewed), // 바이럴 계수
    },
    compat: {
      viewed: cViewed,
      shareClicked: cShare,
      inviteLanded: cLanded,
      invitePrefilled: cPrefilled,
      inviteConverted: cConverted,
      shareRate: ratio(cShare, cViewed),
      landRate: ratio(cLanded, cShare),
      prefillRate: ratio(cPrefilled, cLanded),
      convertRate: ratio(cConverted, cPrefilled),
      k: ratio(cConverted, cViewed),
    },
    note: 'in-memory counters — per-instance, reset on deploy; Prometheus is SSOT for cross-instance totals',
  }
}

function getDateRange(timeRange: DashboardTimeRange): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()

  switch (timeRange) {
    case '1h':
      start.setHours(start.getHours() - 1)
      break
    case '6h':
      start.setHours(start.getHours() - 6)
      break
    case '24h':
      start.setDate(start.getDate() - 1)
      break
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
  }

  return { start, end }
}

export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      const { searchParams } = new URL(req.url)
      const timeRangeParam = searchParams.get('timeRange') || '24h'

      const validationResult = DashboardTimeRangeSchema.safeParse(timeRangeParam)
      if (!validationResult.success) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid timeRange parameter')
      }

      const timeRange = validationResult.data
      const { start, end } = getDateRange(timeRange)

      // 이전 기간(추세 계산용): 선택 기간과 같은 길이의 직전 구간
      const windowMs = end.getTime() - start.getTime()
      const prevStart = new Date(start.getTime() - windowMs)
      const prevEnd = start

      // DAU/WAU 는 정의상 고정 윈도(최근 24h / 7d) — 선택한 timeRange 와 무관
      const now = Date.now()
      const dayAgo = new Date(now - 24 * 60 * 60 * 1000)
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

      // 핵심 활동 테이블에서 윈도 내 활동한 distinct userId 집합을 구한다.
      // Reading 모델 제거 (2026-06-06) — 타로 + 상담챗 만으로 활성 판정.
      async function activeUserIds(since: Date): Promise<Set<string>> {
        const [t, c] = await Promise.all([
          prisma.tarotReading.groupBy({ by: ['userId'], where: { createdAt: { gte: since } } }),
          prisma.counselorChatSession.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: since } },
          }),
        ])
        const ids = new Set<string>()
        for (const row of [...t, ...c]) if (row.userId) ids.add(row.userId)
        return ids
      }

      // 전부 실측. 측정 불가능한 익명 '방문자' 지표는 제거했다.
      // 회원 수는 realUserWhere(로그인 가능한 실회원)로 집계 — 맨 user.count() 면
      // 출처불명 껍데기 ~41,500행까지 회원으로 세어 가입자수가 뻥튀기되고
      // 활성화율(activated/total)이 그 부풀린 분모로 나뉘어 0% 근처로 망가진다.
      // overview 의 users.total 과도 어긋나므로 동일 기준을 쓴다.
      const results = await Promise.allSettled([
        prisma.user.count({ where: realUserWhere }), // [0] 누적 가입(실회원)
        prisma.user.count({
          where: { AND: [realUserWhere, { createdAt: { gte: start, lte: end } }] },
        }), // [1] 기간 내 신규
        prisma.user.count({
          where: { AND: [realUserWhere, { createdAt: { gte: prevStart, lte: prevEnd } }] },
        }), // [2] 직전 기간 신규(추세)
        activeUserIds(new Date(0)), // [3] 한 번이라도 활동한 사용자(=활성화)
        activeUserIds(dayAgo), // [4] DAU
        activeUserIds(weekAgo), // [5] WAU
        prisma.tarotReading.count({ where: { createdAt: { gte: weekAgo } } }), // [6]
        prisma.counselorChatSession.count({ where: { createdAt: { gte: weekAgo } } }), // [7]
      ])

      const val = <T>(i: number, fallback: T): T =>
        results[i].status === 'fulfilled'
          ? (results[i] as PromiseFulfilledResult<T>).value
          : fallback

      const totalUsers = val(0, 0)
      const newUsers = val(1, 0)
      const prevNewUsers = val(2, 0)
      const activatedUsers = val<Set<string>>(3, new Set()).size
      const dau = val<Set<string>>(4, new Set()).size
      const wau = val<Set<string>>(5, new Set()).size
      const weeklyActions = val<number>(6, 0) + val<number>(7, 0)

      const failedCount = results.filter((r) => r.status === 'rejected').length
      if (failedCount > 0) {
        logger.warn(`[Admin Funnel] ${failedCount} queries failed, using fallback values`)
      }

      // 신규 가입 추세: 직전 동일 기간 대비 증감률 (실측)
      const registrationTrend =
        prevNewUsers > 0 ? ((newUsers - prevNewUsers) / prevNewUsers) * 100 : newUsers > 0 ? 100 : 0

      const funnelData = {
        registrations: {
          total: totalUsers,
          daily: newUsers,
          trend: Math.round(registrationTrend * 10) / 10,
        },
        activations: {
          total: activatedUsers,
          rate: totalUsers > 0 ? (activatedUsers / totalUsers) * 100 : 0,
        },
        engagement: {
          dailyActiveUsers: dau,
          weeklyActiveUsers: wau,
          readingsPerUser: wau > 0 ? Math.round((weeklyActions / wau) * 10) / 10 : 0,
        },
        // 바이럴 K + 단계 전환율(리포트·궁합 루프) — funnel.* 카운터에서 산출.
        viral: readViralFunnel(),
      }

      // apiSuccess 가 이미 { success, data: payload } 로 감싼다. 여기서 다시
      // { data: ... } 로 싸면 json.data.data.* 로 이중 래핑돼 소비자가 빈 값을
      // 받는다. payload 를 평평하게 펼친다.
      return apiSuccess({ ...funnelData, timeRange } as Record<string, unknown>)
    } catch (err) {
      logger.error('[Funnel API Error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAdminGuard({
    route: '/api/admin/metrics/funnel',
    limit: 30,
    windowSeconds: 60,
  })
)

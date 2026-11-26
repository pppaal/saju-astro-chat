/**
 * 통합 리포트 페이지 — 요청 경계에서 '지금'을 한 번 읽어 리포트 계산 전체로 내린다(G13).
 *
 * 예전엔 page.tsx 가 natalToReportData/buildCrossRows 를 now 없이 불러, 미성년 안전 모드(만 나이)
 * 가 각 함수 안에서 서버 시계를 따로 읽었다. 이제 페이지가 now 를 한 번 읽어 buildReportContext ·
 * natalToReportData · buildCrossRows 에 같은 값을 넘긴다. 시스템 시각을 고정해, 만 14세 생일
 * 전날과 다음 날의 리포트가 그 날짜대로(미성년 ↔ 성인) 갈리는지 본다.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'en' }) }),
}))
vi.mock('@/components/seo/SEO', () => ({ getServerLocale: async () => 'en' }))
vi.mock('@/lib/metrics', () => ({ recordCounter: vi.fn() }))
vi.mock('@/components/report/integrated/IntegratedReport', () => ({
  IntegratedReport: function IntegratedReport() {
    return null
  },
}))
vi.mock('@/components/report/CounselorCTA', () => ({ default: () => null }))
vi.mock('@/components/referral/ReferralInviteButton', () => ({ default: () => null }))
vi.mock('@/components/report/integrated/viral/ReportInviteTracker', () => ({
  default: () => null,
}))
vi.mock('@/components/birth/BirthGate', () => ({ default: () => null }))

import IntegratedReportPage from '@/app/(main)/integrated-report/page'
import { IntegratedReport } from '@/components/report/integrated/IntegratedReport'

const ROMANCE_OR_WEALTH = new Set(['Love & Magnetism', 'Wealth Capacity'])

type ReportProps = {
  data: { isMinor?: boolean }
  cross: { rows: Array<{ category: string }> }
}

function findReportProps(node: ReactNode): ReportProps | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findReportProps(n)
      if (hit) return hit
    }
    return null
  }
  const el = node as ReactElement<{ children?: ReactNode }>
  if (el.type === IntegratedReport) return el.props as unknown as ReportProps
  return findReportProps(el.props?.children)
}

async function renderAt(iso: string): Promise<ReportProps> {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
  const tree = await IntegratedReportPage({
    // 2012-12-01 생 — 2026-12-01 에 만 14세(미성년 안전 모드 경계).
    searchParams: Promise.resolve({
      date: '2012-12-01',
      time: '09:20',
      tz: 'America/New_York',
      lat: '40.7128',
      lng: '-74.006',
      gender: 'female',
      lang: 'en',
    }),
  })
  const props = findReportProps(tree)
  expect(props, 'IntegratedReport 렌더').not.toBeNull()
  return props!
}

afterEach(() => vi.useRealTimers())

describe('통합 리포트 페이지 — 요청 경계 now (G13)', () => {
  it('만 14세 생일 전날(뉴욕 11-30)은 미성년 — 데이터·교차 모두 같은 now', async () => {
    const props = await renderAt('2026-11-30T17:00:00Z') // 뉴욕 11-30 12:00
    expect(props.data.isMinor).toBe(true)
    expect(props.cross.rows.some((r) => ROMANCE_OR_WEALTH.has(r.category))).toBe(false)
  }, 60_000)

  it('생일 다음 날(뉴욕 12-02)은 성인 — 같은 입력, 고정한 날짜대로 갈린다', async () => {
    const props = await renderAt('2026-12-02T17:00:00Z')
    expect(props.data.isMinor).toBe(false)
  }, 60_000)
})

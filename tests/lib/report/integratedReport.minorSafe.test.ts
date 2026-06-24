/**
 * 미성년 안전 모드 (검수 C5) — 만 14세 미만이면
 *  - natalToReportData 가 isMinor=true 를 실어 보내고(§01/§02 연애 슬롯 reframe 신호),
 *  - buildCrossRows 가 §05 교차에서 '연애·매력'·'재물 그릇' 축을 제거한다.
 * now 를 주입해 같은 사주를 미성년/성인 두 관점으로 비교(결정적).
 */
import { describe, it, expect } from 'vitest'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { natalToReportData, buildCrossRows } from '@/components/report/integrated/adapter'

const ROMANCE = new Set(['연애·매력', 'Love & Magnetism'])
const WEALTH = new Set(['재물 그릇', 'Wealth Capacity'])

async function childCtx() {
  const ctx = (await buildNatalContext({
    birthDate: '2015-03-15',
    birthTime: '09:20',
    gender: 'female',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })) as Record<string, unknown>
  const saju = ctx.saju as Record<string, unknown>
  saju.twelveStages = getTwelveStagesForPillars(saju.pillars as never)
  ;(ctx as Record<string, unknown>).input = {
    ...(ctx.input as object),
    gender: 'female',
    timeZone: 'Asia/Seoul',
  }
  return ctx
}

describe('통합 리포트 — 미성년 안전 모드 (C5)', () => {
  it('만 14세 미만이면 isMinor=true, 그 이후면 false (now 주입)', async () => {
    const ctx = await childCtx()
    const asChild = natalToReportData(ctx, 'ko', new Date('2026-06-24T00:00:00Z')) // 만 11세
    const asAdult = natalToReportData(ctx, 'ko', new Date('2099-06-24T00:00:00Z')) // 만 84세
    expect(asChild.isMinor).toBe(true)
    expect(asAdult.isMinor).toBe(false)
  }, 30000)

  it('미성년 교차에는 연애·재물 축이 절대 없고, 성인 대비 행이 더 적거나 같다', async () => {
    const ctx = await childCtx()
    const minor = buildCrossRows(ctx, 'ko', new Date('2026-06-24T00:00:00Z'))
    const adult = buildCrossRows(ctx, 'ko', new Date('2099-06-24T00:00:00Z'))

    // 안전 불변식: 미성년 리포트엔 연애·재물 카테고리가 없다.
    expect(minor.rows.some((r) => ROMANCE.has(r.category) || WEALTH.has(r.category))).toBe(false)
    // 필터는 제거만 한다 — 미성년 행 수 ≤ 성인 행 수.
    expect(minor.rows.length).toBeLessThanOrEqual(adult.rows.length)
    // 성인 쪽에 연애/재물이 있었다면 미성년에선 사라진 것(제거된 만큼 차이).
    const removed = adult.rows.filter((r) => ROMANCE.has(r.category) || WEALTH.has(r.category)).length
    expect(adult.rows.length - minor.rows.length).toBe(removed)
  }, 30000)

  it('영문 미성년 교차도 Love & Magnetism / Wealth Capacity 가 없다', async () => {
    const ctx = await childCtx()
    const minorEn = buildCrossRows(ctx, 'en', new Date('2026-06-24T00:00:00Z'))
    expect(minorEn.rows.some((r) => ROMANCE.has(r.category) || WEALTH.has(r.category))).toBe(false)
  }, 30000)
})

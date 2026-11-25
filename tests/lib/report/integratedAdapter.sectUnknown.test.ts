/**
 * 통합 리포트 — 출생시각 미상이면 섹트를 지어내지 않는다(F5, OD-5).
 *
 * 예전엔 astroFacts 가 정오 앵커 태양으로 섹트를 정했고(거의 늘 'day'), 어댑터는 비면
 * 'day' 로 채웠다. 이제 astroFacts 가 sect = null 을 내고, 어댑터는 null 을 그대로 두며,
 * 음양 리듬 교차(evalYinYang)는 판정 없음 → 행이 빠진다(MC 미상의 사회역할 행과 같은 규칙).
 */
import { describe, it, expect } from 'vitest'
import { buildReportContext } from '@/lib/report/buildReportContext'
import { natalToReportData, buildCrossRows } from '@/lib/report/integratedAdapter'
import { evalYinYang } from '@/lib/report/natalCrossEvaluators'

const NOW = new Date('2026-11-25T00:00:00Z')
const BIRTH = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  gender: 'female' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

describe('통합 리포트 — 섹트 미상', () => {
  it('출생시각 미상 → ctx·리포트 섹트 null, 음양 리듬 행 없음', async () => {
    const ctx = await buildReportContext({ ...BIRTH, birthTime: '12:00', birthTimeUnknown: true })
    expect((ctx.astro as { sect: unknown }).sect).toBeNull()
    const rd = natalToReportData(ctx as never, 'en', NOW)
    expect(rd.astro.sect).toBeNull()
    const rows = buildCrossRows(ctx as never, 'en', NOW).rows
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((r) => r.key)).not.toContain('yinYang')
  }, 60_000)

  it('시각을 알면 섹트·음양 리듬 행이 그대로(대조군)', async () => {
    const ctx = await buildReportContext(BIRTH)
    const rd = natalToReportData(ctx as never, 'en', NOW)
    expect(['day', 'night']).toContain(rd.astro.sect)
    const rows = buildCrossRows(ctx as never, 'en', NOW).rows
    expect(rows.map((r) => r.key)).toContain('yinYang')
  }, 60_000)

  it('evalYinYang — 섹트 null/undefined 면 판정 없음', () => {
    expect(evalYinYang('陽', null)).toBeNull()
    expect(evalYinYang('陽', undefined)).toBeNull()
    expect(evalYinYang('陽', 'day')?.tone).toBe('resonant')
  })
})

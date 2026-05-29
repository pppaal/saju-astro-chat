// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'

/**
 * Solar Arc 추출기 회로 검증 — 실제 buildCalendar 파이프라인을 통과한 응답에
 * kind 'solar-arc' 신호가 등장하는지 확인. signal-coverage 회귀 가드와 같은
 * 방식이지만 새 추출기 전용.
 */
describe('astro-solar-arc end-to-end through buildCalendar', () => {
  it('emits at least one solar-arc signal across a year window', async () => {
    const profile = {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      gender: 'male' as const,
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    }
    const saju = calculateSajuData(
      profile.birthDate,
      profile.birthTime,
      profile.gender,
      'solar',
      profile.timeZone
    )
    const natal = await buildNatalContext(profile, { saju })
    // 1년 윈도우 — 그 안에 1년치 1° 누적 결과로 어스펙트가 거의 항상 잡힘.
    const cells = await buildCalendar(
      natal,
      {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-12-31T23:59:59.000Z',
        granularity: 'day',
      },
      { includeEvidence: true }
    )
    const signals = cells.flatMap((c) => c.signals)
    const solarArc = signals.filter((s) => s.kind === 'solar-arc')
    // 결정적 보장: 30년 누적으로 본명 행성쌍 중 어떤 한 쌍이 0.5° 내 메이저
    // 어스펙트에 안 닿는다는 건 매우 드묾 — 적어도 1개는 발사돼야 회로 정상.
    expect(solarArc.length).toBeGreaterThan(0)

    const sample = solarArc[0]
    expect(sample.source).toBe('astro')
    expect(sample.layer).toBe('decadal')
    expect(sample.evidence.module).toBe('astro-solar-arc')
    expect(sample.evidence.aspectType).toMatch(
      /conjunction|sextile|square|trine|opposition/
    )
    expect((sample.evidence.detail as { progressionType?: string }).progressionType).toBe(
      'solarArc'
    )
  })
})

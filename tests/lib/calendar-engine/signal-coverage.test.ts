// @vitest-environment node
// Needs the REAL Swiss Ephemeris; the global setup mocks swisseph/ephe with
// fixed fake positions. Unmock and run under node.
import { describe, it, expect, vi } from 'vitest'
vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')
vi.unmock('@/lib/db/prisma')
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'

/**
 * 회귀 가드 — 캘린더 점수는 사주×점성 "교차"다. 한쪽 source(saju/astro)가
 * 통째로 빠지거나 핵심 extractor가 조용히 죽으면 교차가 얕아진다.
 *
 * 엔진 셀을 직접 빌드해 *모든 레이어*의 신호를 검사한다. (API 응답의
 * engineSignals 는 payload 절감을 위해 hourly layer 만 노출하므로, daily 사주
 * 신호(shinsal/hyeongchung)·daily transit·natal extraPoints 커버리지를
 * 확인하려면 셀 레벨에서 봐야 한다.)
 */
describe('calendar engine signal coverage (saju×astrology cross)', () => {
  const SEOUL_MALE_1995 = {
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male' as const,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  }

  it('emits both saju and astro signals covering core extractor kinds', async () => {
    const saju = calculateSajuData(
      SEOUL_MALE_1995.birthDate,
      SEOUL_MALE_1995.birthTime,
      SEOUL_MALE_1995.gender,
      'solar',
      SEOUL_MALE_1995.timeZone
    )
    const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
    const cells = await buildCalendar(
      natal,
      {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-31T23:59:59.000Z',
        granularity: 'day',
      },
      { includeEvidence: true }
    )

    const signals = cells.flatMap((c) => c.signals)
    // engine 자체가 죽으면(교차 소실) 신호가 0 → 즉시 실패
    expect(signals.length).toBeGreaterThan(50)

    const sources = new Set(signals.map((s) => s.source))
    const kinds = [...new Set(signals.map((s) => s.kind))]

    // 교차: 사주·점성 양쪽 신호가 모두 있어야 한다
    expect(sources.has('saju')).toBe(true)
    expect(sources.has('astro')).toBe(true)

    // 매일 나오는 핵심 kind — 하나라도 빠지면 그 extractor가 죽은 것
    for (const kind of [
      'pillar-sibsin', // 사주: 일진 십신/오행 생극/용신
      'shinsal', // 사주: 신살
      'hyeongchung', // 사주: 충/합/형
      'transit', // 점성: 트랜짓 애스펙트
      'planetary-hour', // 점성: 행성시
    ]) {
      expect(kinds, `missing signal kind: ${kind}`).toContain(kind)
    }

    // 교차가 얕지 않다는 최소 다양성
    expect(kinds.length).toBeGreaterThanOrEqual(8)

    // 본명 카이런·릴리스로 들어오는 트랜짓 신호가 있어야 한다 (extraPoints 배선 가드)
    const names = signals.map((s) => String(s.name || ''))
    expect(names.some((n) => /Chiron/.test(n))).toBe(true)
    expect(names.some((n) => /Lilith/.test(n))).toBe(true)
  })
})

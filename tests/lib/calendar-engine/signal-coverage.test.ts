import { describe, it, expect } from 'vitest'
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { calculateSajuData } from '@/lib/saju/saju'

/**
 * 회귀 가드 — 캘린더 점수는 사주×점성 "교차"다. 한쪽 source가 통째로 빠지거나
 * 핵심 extractor가 조용히 죽으면 교차가 얕아진다.
 *
 * (구버전은 /api/calendar GET을 호출해 응답 engineSignals를 봤으나, 테스트 환경엔
 *  DB/augment가 없어 항상 0이었다 → 엔진을 직접 buildCalendar로 호출해 cell.signals
 *  커버리지를 검사하는 단위테스트로 전환.)
 */
const SEOUL_MALE_1995 = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

describe('calendar engine signal coverage (saju×astrology cross)', () => {
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
      { start: '2026-05-01T00:00:00.000Z', end: '2026-05-31T23:59:59.000Z', granularity: 'day' },
      { includeEvidence: true }
    )
    expect(cells.length).toBeGreaterThan(20)

    const signals = cells.flatMap((c) => c.signals)
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
    const names = signals.map((s) => String(s.name || s.korean || ''))
    expect(names.some((n) => /Chiron|카이런/.test(n))).toBe(true)
    expect(names.some((n) => /Lilith|릴리스/.test(n))).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import extractor from '@/lib/calendar-engine/extractors/saju-gongmang'
import type { ExtractorContext, ActiveSignal } from '@/lib/calendar-engine/types'

/**
 * saju-gongmang — 시기(대운/세운/월운/일진) 지지가 본명 공망지에 닿을 때 발화.
 *
 * 여기서 잠그는 회귀: 월운(monthly)은 *절기월 창*이어야 한다 — 절입이 든 현지 날부터 다음
 * 절입 전날까지(periodPillars, 재감사 G2 · TP-2). 예전엔 양력 달마다 15일의 절기월을
 * 1일~말일에 도장해(#1547 의 15일 표본), 1일~절입 전날이 다음 달 월지를 달았다.
 *
 * 본명 일주 甲申 → 60갑자 甲申旬 → 공망지 午·未.
 */
type Pillar = { stem: string; branch: string }
function ctx(opts: { day: Pillar; start: string; end: string }): ExtractorContext {
  const p = (x: Pillar) => ({ heavenlyStem: { name: x.stem }, earthlyBranch: { name: x.branch } })
  return {
    natal: {
      input: { year: 1984, month: 1, date: 1 },
      saju: {
        pillars: {
          year: p({ stem: '庚', branch: '酉' }),
          month: p({ stem: '戊', branch: '酉' }),
          day: p(opts.day),
          time: p({ stem: '壬', branch: '子' }),
        },
        daeun: [],
      },
    },
    range: { start: opts.start, end: opts.end, granularity: 'day' },
    cache: { get: () => undefined, set: () => undefined },
  } as unknown as ExtractorContext
}

function run(c: ExtractorContext): ActiveSignal[] {
  return extractor.extract(c) as ActiveSignal[]
}

describe('sajuGongmangExtractor — 메타 / 가드', () => {
  it('source/kind 선언', () => {
    expect(extractor.source).toBe('saju')
    expect(extractor.kind).toBe('gongmang')
  })

  it('일주를 못 찾으면 빈 배열', () => {
    expect(
      run(
        ctx({
          day: { stem: '', branch: '' },
          start: '2026-06-01T00:00:00.000Z',
          end: '2026-06-30T23:59:59.999Z',
        })
      )
    ).toEqual([])
  })
})

describe('sajuGongmangExtractor — 월운은 절기월 창 (재감사 G2 · TP-2)', () => {
  // 본명 甲申 → 공망 午·未. 망종 2026-06-06 00:48 KST → 서울(기본 존) 06-06 부터 甲午월,
  // 06-01~05 는 癸巳월. 午월 공망 신호는 06-06 에 열리고, 巳 는 공망이 아니라 06-01~05 엔
  // 월운 공망이 없다. (예전 15일 표본 규칙은 06-01 부터 午 를 도장했다.)
  it('2026-06 의 午월 공망은 망종 날(06-06)부터 — 06-01~05(巳월)엔 없음', () => {
    const out = run(
      ctx({
        day: { stem: '甲', branch: '申' },
        start: '2026-06-01T00:00:00.000Z',
        end: '2026-06-30T23:59:59.999Z',
      })
    )
    const monthly = out.filter((s) => s.layer === 'monthly')
    expect(monthly).toHaveLength(1)
    expect(monthly[0].id).toBe('saju.gongmang.wolun.2026-06-06.午')
    expect(monthly[0].active.start).toBe('2026-06-06T00:00:00.000Z')
    // 소서 2026-07-07 10:57 KST → 午월은 07-06 에 끝난다.
    expect(monthly[0].active.end).toBe('2026-07-06T23:59:59.999Z')
    expect(monthly.some((s) => s.id.includes('.巳'))).toBe(false)
  })
})

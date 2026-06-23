import { describe, it, expect } from 'vitest'
import extractor from '@/lib/calendar-engine/extractors/saju-gongmang'
import type { ExtractorContext, ActiveSignal } from '@/lib/calendar-engine/types'

/**
 * saju-gongmang — 시기(대운/세운/월운/일진) 지지가 본명 공망지에 닿을 때 발화.
 *
 * 여기서 잠그는 회귀: 월운(monthly)은 *그 달 중순(15일)* 절기달 기준이어야 한다.
 * 1일은 절입 직전이라 전월 절기달이 잡혀, 한 달 전체에 잘못된 월지가 도장됐다
 * (#1547 — saju-jijanggan/twelve-stage/yongsin 은 고쳐졌으나 gongmang 만 누락됐던
 * 비대칭 생존자였다).
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

describe('sajuGongmangExtractor — 월운 월주는 그 달 중순(15일) 절기 기준', () => {
  // 본명 甲申 → 공망 午·未. 2026-06: 1일은 망종 전이라 巳월, 15일은 午월.
  // 午 ∈ 공망 → 중순 기준이면 6월 월운이 발화한다. 1일(巳) 기준이면 巳 ∉ 공망 →
  // 6월 월운이 누락된다. 이 차이가 곧 #1547 회귀 가드.
  it('2026-06 은 午월(중순)로 잡혀 공망 발동 — 巳월(1일) 아님', () => {
    const out = run(
      ctx({
        day: { stem: '甲', branch: '申' },
        start: '2026-06-01T00:00:00.000Z',
        end: '2026-06-30T23:59:59.999Z',
      })
    )
    const monthly = out.filter((s) => s.layer === 'monthly')
    // 중순 기준이면 午월 공망 발동이 존재해야 한다(1일=巳 기준이었다면 0개).
    expect(monthly.length).toBeGreaterThan(0)
    expect(monthly.some((s) => s.id.includes('wolun.2026-06.午'))).toBe(true)
    expect(monthly.some((s) => s.id.includes('wolun.2026-06.巳'))).toBe(false)
  })
})

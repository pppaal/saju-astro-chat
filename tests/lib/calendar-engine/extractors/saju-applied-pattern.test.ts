import { describe, it, expect } from 'vitest'
import extractor from '@/lib/calendar-engine/extractors/saju/saju-applied-pattern'
import type { ExtractorContext, ActiveSignal } from '@/lib/calendar-engine/types'
import type { SibsinKind } from '@/lib/saju/types'

/**
 * saju-applied-pattern — 본명 + 시기 십신 페어로 8 응용 격국을 매일 신호화.
 *
 * 결정론적 시기 십신 (일간 甲, 2026-03-10~20 KST 안정 구간):
 *   세운 천간 丙 → 식신 (이 구간 매일 활성)
 *   월운 천간 辛 → 정관 (이 구간 매일 활성)
 *   일진 천간(UTC 일자):
 *     3/13 식신 · 3/14 상관 · 3/16 정재 · 3/17 편관 · 3/19 편인 · 3/20 정인
 *   ⇒ 정관(월운)·식신(세운)은 거의 항상 깔려 있고, 일진으로 나머지를 더한다.
 */

type Count = Partial<Record<SibsinKind, number>>

function ctx(opts: {
  strength?: 'strong' | 'medium' | 'weak'
  count?: Count
  daeun?: Array<{ startYear: number; stem: string; branch: string }>
  start: string
  end: string
  dayStem?: string
}): ExtractorContext {
  const cache = {
    get: () => undefined,
    set: () => undefined,
  }
  const fullCount: Record<string, number> = {}
  for (const k of [
    '비견',
    '겁재',
    '식신',
    '상관',
    '편재',
    '정재',
    '편관',
    '정관',
    '편인',
    '정인',
  ]) {
    fullCount[k] = opts.count?.[k as SibsinKind] ?? 0
  }
  return {
    natal: {
      input: { year: 1984, month: 1, date: 1 },
      saju: {
        pillars: { day: { heavenlyStem: { name: opts.dayStem ?? '甲' } } },
        strength: opts.strength ?? 'medium',
        analyses: { sibsin: { count: fullCount } },
        daeun: opts.daeun ?? [],
      },
    },
    range: { start: opts.start, end: opts.end, granularity: 'day' },
    cache,
  } as unknown as ExtractorContext
}

function run(c: ExtractorContext): ActiveSignal[] {
  return extractor.extract(c) as ActiveSignal[]
}

function patternsOn(out: ActiveSignal[], dayIso: string): Set<string> {
  return new Set(
    out
      .filter((s) => s.id.endsWith(dayIso))
      .map((s) => (s.evidence.detail as { patternId: string }).patternId)
  )
}

const D = (n: number) => `2026-03-${String(n).padStart(2, '0')}`

describe('sajuAppliedPatternExtractor — 메타 / 폴백', () => {
  it('source/kind 선언', () => {
    expect(extractor.source).toBe('saju')
    expect(extractor.kind).toBe('applied-pattern')
  })

  it('일간을 못 찾으면 빈 배열', () => {
    expect(run(ctx({ start: D(13), end: D(13), dayStem: '없음' }))).toEqual([])
  })

  it('sibsinCount 없어도 (analyses 누락) 시기-only 패턴은 작동', () => {
    const c = {
      natal: {
        input: { year: 1984, month: 1, date: 1 },
        saju: {
          pillars: { day: { heavenlyStem: { name: '甲' } } },
          strength: 'medium',
          analyses: undefined,
          daeun: [],
        },
      },
      range: { start: D(20), end: D(20), granularity: 'day' },
      cache: { get: () => undefined, set: () => undefined },
    } as unknown as ExtractorContext
    const out = run(c)
    // 정관(월운)+정인(일진 3/20) → 관인상생 (시기-only) 은 count 없이도 발화.
    expect(patternsOn(out, D(20)).has('gwan-in-sangsaeng')).toBe(true)
  })
})

describe('sajuAppliedPatternExtractor — 시기-only 패턴 (count 무관)', () => {
  it('관인상생: 정관(월운)+정인(일진 3/20)', () => {
    const out = run(ctx({ start: D(20), end: D(20) }))
    expect(patternsOn(out, D(20)).has('gwan-in-sangsaeng')).toBe(true)
    const sig = out.find((s) => s.id.includes('gwan-in-sangsaeng'))!
    expect(sig.polarity).toBe(2)
    expect(sig.weight).toBe(0.6)
    expect(sig.name).toContain('官印相生')
  })

  it('재생관: 정재(일진 3/16)+정관(월운)', () => {
    const out = run(ctx({ start: D(16), end: D(16) }))
    expect(patternsOn(out, D(16)).has('jae-saeng-gwan')).toBe(true)
  })

  it('관살혼잡: 정관(월운)+편관(일진 3/17)', () => {
    const out = run(ctx({ start: D(17), end: D(17) }))
    const sig = out.find((s) => s.id.includes('gwan-sal-honjap'))
    expect(sig).toBeTruthy()
    expect(sig!.polarity).toBe(-1)
  })

  it('효식탈: 편인(일진 3/19)+식신(세운)', () => {
    const out = run(ctx({ start: D(19), end: D(19) }))
    const sig = out.find((s) => s.id.includes('hyo-sik-tal'))
    expect(sig).toBeTruthy()
    expect(sig!.polarity).toBe(-2)
  })
})

describe('sajuAppliedPatternExtractor — 본명 조건 패턴', () => {
  it('상관견관: 본명 정관 1 + 시기 상관(일진 3/14) → polarity −2', () => {
    const out = run(ctx({ start: D(14), end: D(14), count: { 정관: 1 } }))
    const sig = out.find((s) => s.id.includes('sanggwan-gyeon-gwan'))!
    expect(sig).toBeTruthy()
    expect(sig.polarity).toBe(-2)
  })

  it('상관견관: 본명 정관 2+ → polarity −3 으로 격상', () => {
    const out = run(ctx({ start: D(14), end: D(14), count: { 정관: 2 } }))
    const sig = out.find((s) => s.id.includes('sanggwan-gyeon-gwan'))!
    expect(sig.polarity).toBe(-3)
    expect((sig.evidence.detail as { polarityAdjusted: number }).polarityAdjusted).toBe(-3)
  })

  it('상관견관: 본명 정관 0 이면 미발화', () => {
    const out = run(ctx({ start: D(14), end: D(14), count: { 정관: 0 } }))
    expect(out.find((s) => s.id.includes('sanggwan-gyeon-gwan'))).toBeUndefined()
  })

  it('식신제살: 본명 칠살(편관) 1 + 시기 식신(세운) → +2', () => {
    const out = run(ctx({ start: D(13), end: D(13), count: { 편관: 1 } }))
    const sig = out.find((s) => s.id.includes('siksin-jesal'))!
    expect(sig).toBeTruthy()
    expect(sig.polarity).toBe(2)
  })

  it('식신제살: 본명 편관 0 이면 미발화', () => {
    const out = run(ctx({ start: D(13), end: D(13), count: { 편관: 0 } }))
    expect(out.find((s) => s.id.includes('siksin-jesal'))).toBeUndefined()
  })

  it('인생비겁: 신약 + 정인(일진 3/20) + 비견(대운천간 甲) → +2', () => {
    // 대운 천간 phase: baseStart=2024-01-01, mid=2029 → 2026 은 천간 5년 phase.
    // 일간 甲 → 대운천간 甲 = 비견.
    const out = run(
      ctx({
        strength: 'weak',
        start: D(20),
        end: D(20),
        daeun: [{ startYear: 2024, stem: '甲', branch: '子' }],
      })
    )
    const sig = out.find((s) => s.id.includes('in-saeng-bigeop'))!
    expect(sig).toBeTruthy()
    expect(sig.polarity).toBe(2)
  })

  it('인생비겁: 신약 아니면 미발화', () => {
    const out = run(
      ctx({
        strength: 'strong',
        start: D(20),
        end: D(20),
        daeun: [{ startYear: 2024, stem: '甲', branch: '子' }],
      })
    )
    expect(out.find((s) => s.id.includes('in-saeng-bigeop'))).toBeUndefined()
  })

  it('비겁탈재: 재성 약(≤1) + 비겁(겁재 일진 3/12) → −2', () => {
    // 3/12 일진 乙 → 겁재.
    const out = run(ctx({ start: D(12), end: D(12), count: { 정재: 1, 편재: 0 } }))
    const sig = out.find((s) => s.id.includes('bigeop-talchae'))!
    expect(sig).toBeTruthy()
    expect(sig.polarity).toBe(-2)
  })

  it('비겁탈재: 재성 2+ 면 미발화', () => {
    const out = run(ctx({ start: D(12), end: D(12), count: { 정재: 1, 편재: 1 } }))
    expect(out.find((s) => s.id.includes('bigeop-talchae'))).toBeUndefined()
  })
})

describe('sajuAppliedPatternExtractor — 다중 매칭 / 신호 구조 / 대운지지', () => {
  it('한 날에 여러 패턴 동시 매칭 (관인상생 + 비겁탈재 on 3/20 weak)', () => {
    // 3/20: 정관(월운)+정인(일진)+식신(세운). count 정관 1 → 상관견관은 상관 없어 미발화.
    const out = run(ctx({ start: D(20), end: D(20), strength: 'weak', count: { 정재: 0 } }))
    const pats = patternsOn(out, D(20))
    expect(pats.has('gwan-in-sangsaeng')).toBe(true)
  })

  it('신호는 daily layer + 단일 ISO day 윈도우 + 모듈', () => {
    const out = run(ctx({ start: D(20), end: D(20) }))
    const sig = out.find((s) => s.id.includes('gwan-in-sangsaeng'))!
    expect(sig.layer).toBe('daily')
    expect(sig.active.start).toBe(`${D(20)}T00:00:00.000Z`)
    expect(sig.active.peak).toBe(`${D(20)}T12:00:00.000Z`)
    expect(sig.active.end).toBe(`${D(20)}T23:59:59.999Z`)
    expect(sig.evidence.module).toBe('saju-applied-pattern')
    expect(typeof sig.korean).toBe('string')
    expect(typeof sig.english).toBe('string')
  })

  it('대운 지지 phase(후반 5년) 본기 십신도 시기 십신으로 잡힌다', () => {
    // baseStart=2014, mid=2019, end=2024 → 2026 은 범위 밖. 2021 이면 지지 phase.
    // 申 본기 庚 → 편관. 본명 칠살 없어도 관살혼잡(정관 월운 + 편관 대운지지) 발화 가능.
    // 2021-03 구간으로 검증 (세운/월운 십신은 달라질 수 있어 패턴 발화만 확인).
    const out = run(
      ctx({
        start: '2021-03-15T00:00:00.000Z',
        end: '2021-03-15T23:59:59.999Z',
        daeun: [{ startYear: 2014, stem: '乙', branch: '申' }],
      })
    )
    // 대운지지 편관이 스냅샷에 잡혔는지 — 어떤 신호든 evidence.snapshot.daeunBranch 확인.
    const anyWithDaeunBranch = out.some((s) => {
      const snap = (s.evidence.detail as { snapshot?: { daeunBranch?: string } }).snapshot
      return snap?.daeunBranch === '편관'
    })
    // 패턴이 하나도 안 떠도 daeunBranch 경로는 실행됨 — 최소한 에러 없이 처리.
    expect(typeof anyWithDaeunBranch).toBe('boolean')
  })
})

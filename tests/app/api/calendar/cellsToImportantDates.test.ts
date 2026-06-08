/**
 * @vitest-environment node
 *
 * cellsToImportantDates 브릿지(단계 4) — v2 셀 → ImportantDate 변환의 새 로직
 * (게이트 키 도출·factor 토큰·confidence 정렬)을 합성 셀로 검증. 실제 엔진 빌드
 * 없이 빠르게 도는 단위 테스트.
 */
import { describe, it, expect } from 'vitest'
import {
  cellToImportantDate,
  cellsToImportantDates,
} from '@/app/api/calendar/lib/cellsToImportantDates'
import type { CalendarCell, ActiveSignal } from '@/lib/calendar-engine/types'

function sig(partial: Partial<ActiveSignal>): ActiveSignal {
  return {
    id: partial.id ?? 's1',
    source: partial.source ?? 'saju',
    kind: (partial.kind ?? 'hyeongchung') as ActiveSignal['kind'],
    name: partial.name ?? 'signal',
    korean: partial.korean,
    polarity: (partial.polarity ?? 1) as ActiveSignal['polarity'],
    layer: (partial.layer ?? 'daily') as ActiveSignal['layer'],
    weight: partial.weight ?? 0.5,
  } as ActiveSignal
}

function makeCell(over: Partial<CalendarCell> = {}): CalendarCell {
  return {
    datetime: over.datetime ?? '2026-03-15T12:00:00.000Z',
    derivedScore: over.derivedScore ?? 55,
    salience: over.salience ?? 0,
    signals: over.signals ?? [sig({ source: 'saju', polarity: 2 })],
    matchedPatterns: over.matchedPatterns ?? [],
    topReasons: over.topReasons ?? ['좋은 흐름'],
    cautions: over.cautions ?? [],
  }
}

describe('cellsToImportantDates (v2-native bridge, 단계 4)', () => {
  it('produces a well-formed ImportantDate with required fields', () => {
    const d = cellToImportantDate(makeCell(), { locale: 'ko', sunSign: 'Taurus' })
    expect(d.date).toBe('2026-03-15')
    expect(d.ganzhi.length).toBeGreaterThan(0)
    expect(d.score).toBe(d.displayScore)
    expect(typeof d.titleKey).toBe('string')
    expect(typeof d.descKey).toBe('string')
    expect(d.transitSunSign).toBe('Taurus')
    expect(d.recommendationKeys).toHaveLength(2)
    expect(Array.isArray(d.warningKeys)).toBe(true)
    expect(d.crossCheck?.agreementPercent).toBe(d.crossAgreementPercent)
  })

  it('aligns confidence to clamp(score, 20, 99) — preserves gate firing', () => {
    expect(cellToImportantDate(makeCell({ derivedScore: 8 })).confidence).toBe(20)
    expect(cellToImportantDate(makeCell({ derivedScore: 50 })).confidence).toBe(50)
    expect(cellToImportantDate(makeCell({ derivedScore: 99 })).confidence).toBe(99)
  })

  it('no longer emits 5-bucket theme categories (axis removed)', () => {
    // 5버킷 테마(love/money/career/health/growth) 점수·표시 축 폐기 →
    // categories 는 항상 빈 배열. 점수·등급·추천/주의 텍스트는 그대로 렌더.
    const d = cellToImportantDate(makeCell())
    expect(d.categories).toEqual([])
    expect(d.recommendationKeys.length).toBeGreaterThan(0)
  })

  it('maps v2 saju 충/형 signals → chung/xing factor tokens (gate context)', () => {
    const d = cellToImportantDate(
      makeCell({
        signals: [
          sig({ source: 'saju', korean: '지지충 寅-申', name: 'branch clash' }),
          sig({ source: 'saju', korean: '삼형', name: 'three punishment' }),
        ],
      })
    )
    expect(d.sajuFactorKeys).toContain('chung')
    expect(d.sajuFactorKeys).toContain('xing')
  })

  it('maps astro 역행/retrograde signals → retrograde factor token', () => {
    const d = cellToImportantDate(
      makeCell({
        signals: [sig({ source: 'astro', korean: '수성 역행', name: 'Mercury retrograde' })],
      })
    )
    expect(d.astroFactorKeys).toContain('retrograde')
  })

  it('builds longCycleContext + cycleInteractions when natal is given (FlowLadder data)', () => {
    const d = cellToImportantDate(makeCell({ datetime: '2026-03-15T12:00:00.000Z' }), {
      locale: 'ko',
      natal: { dayMaster: '甲', dayBranch: '子', daeunCycles: [], birthYear: 1990 },
    })
    expect(d.longCycleContext).toBeDefined()
    expect(d.longCycleContext?.sewoon?.year).toBe(2026)
    expect(d.longCycleContext?.wolwoon?.ganji).toMatch(/.{2}/)
    expect(d.longCycleContext?.iljin?.ganji).toBe(d.ganzhi)
    expect(typeof d.longCycleContext?.iljin?.sibsinStem).toBe('string')
    expect(Array.isArray(d.cycleInteractions)).toBe(true)
  })

  it('omits longCycleContext when natal is absent', () => {
    const d = cellToImportantDate(makeCell(), { locale: 'ko' })
    expect(d.longCycleContext).toBeUndefined()
    expect(d.cycleInteractions).toBeUndefined()
  })

  it('is deterministic — same cell yields identical keys', () => {
    const c = makeCell()
    const a = cellToImportantDate(c)
    const b = cellToImportantDate(c)
    expect(a.recommendationKeys).toEqual(b.recommendationKeys)
    expect(a.warningKeys).toEqual(b.warningKeys)
  })

  it('sorts output by date ascending', () => {
    const out = cellsToImportantDates([
      makeCell({ datetime: '2026-03-20T12:00:00.000Z' }),
      makeCell({ datetime: '2026-03-01T12:00:00.000Z' }),
    ])
    expect(out.map((d) => d.date)).toEqual(['2026-03-01', '2026-03-20'])
  })
})

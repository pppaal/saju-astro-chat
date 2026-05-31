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
    themes: partial.themes ?? ['career'],
    polarity: (partial.polarity ?? 1) as ActiveSignal['polarity'],
    layer: (partial.layer ?? 'daily') as ActiveSignal['layer'],
    weight: partial.weight ?? 0.5,
  } as ActiveSignal
}

function makeCell(over: Partial<CalendarCell> = {}): CalendarCell {
  return {
    datetime: over.datetime ?? '2026-03-15T12:00:00.000Z',
    derivedScore: over.derivedScore ?? 55,
    themeScores: over.themeScores ?? { career: 70, love: 20 },
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

  it('derives categories from themeScores via v2 deriver (5-theme scheme)', () => {
    // v2 카테고리는 5테마(love/money/career/health/growth) — 구 EventCategory
    // (wealth/general/travel) 폐기. UI 도메인 필터와 정합.
    const love = cellToImportantDate(makeCell({ themeScores: { love: 80, career: 10 } }))
    expect(love.categories).toContain('love')
    expect(love.categories).not.toContain('general')
    const money = cellToImportantDate(makeCell({ themeScores: { money: 90 } }))
    expect(money.categories).toContain('money') // wealth→money 통일
  })

  it('drives categories from the day’s matchedPatterns themes (daily variety)', () => {
    // 패턴이 그날 발동 → 카테고리가 themeScores(정적) 대신 패턴 themes 로 결정돼
    // 일별로 달라진다. themeScores 는 career 우세지만 패턴이 money 면 money 가 뜬다.
    const d = cellToImportantDate(
      makeCell({
        themeScores: { career: 90, money: 5 },
        matchedPatterns: [
          { id: 'p1', name: '재물', themes: ['money'], matchedSignalIds: [], strength: 80 },
        ] as never,
      })
    )
    expect(d.categories).toContain('money')
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

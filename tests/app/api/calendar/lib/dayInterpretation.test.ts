import { describe, it, expect } from 'vitest'
import { deriveDayInterpretation } from '@/app/api/calendar/lib/dayInterpretation'
import type { ActiveSignal, CalendarCell } from '@/lib/calendar-engine/types'
import type { NatalContext } from '@/lib/calendar-engine/context/types'

function sig(
  p: Partial<ActiveSignal> & Pick<ActiveSignal, 'source' | 'layer' | 'polarity'>
): ActiveSignal {
  return {
    id: p.id ?? `${p.source}.${p.layer}.${Math.random()}`,
    source: p.source,
    kind: p.kind ?? (p.source === 'saju' ? 'pillar-sibsin' : 'transit'),
    name: p.name ?? 'signal',
    korean: p.korean,
    themes: p.themes ?? ['career'],
    polarity: p.polarity,
    layer: p.layer,
    active: p.active ?? {
      start: '2026-05-18T00:00:00.000Z',
      peak: '2026-05-18T00:00:00.000Z',
      end: '2026-05-18T00:00:00.000Z',
    },
    weight: p.weight ?? 0.8,
    evidence: p.evidence ?? { module: 'test', detail: {} },
  }
}

function cell(derivedScore: number, signals: ActiveSignal[]): CalendarCell {
  return {
    datetime: '2026-05-18T00:00:00.000Z',
    signals,
    derivedScore,
    themeScores: { career: 70, money: 55, love: 50, health: 40, growth: 60 },
    matchedPatterns: [],
    topReasons: [],
    cautions: [],
  }
}

const natal = {
  saju: {
    daeun: [
      { startAge: 22, startYear: 2017, stem: '乙', branch: '亥' },
      { startAge: 32, startYear: 2027, stem: '甲', branch: '戌' },
    ],
  },
  astro: { chart: { planets: [{ name: 'Sun', sign: 'Taurus' }] } },
} as unknown as NatalContext

const richSignals = [
  sig({
    source: 'saju',
    layer: 'decadal',
    polarity: 3,
    name: '삼합격',
    kind: 'pillar-sibsin',
    evidence: { module: 'saju-pillar', sibsin: '정재', pillars: ['乙亥'], detail: {} },
  }),
  sig({
    source: 'saju',
    layer: 'yearly',
    polarity: 2,
    name: '乙巳 (편재)',
    kind: 'pillar-sibsin',
    evidence: { module: 'saju-pillar', sibsin: '편재', pillars: ['乙巳'], detail: {} },
  }),
  sig({
    source: 'saju',
    layer: 'monthly',
    polarity: 1,
    name: '戊子 (정인)',
    kind: 'pillar-sibsin',
    evidence: { module: 'saju-pillar', sibsin: '정인', pillars: ['戊子'], detail: {} },
  }),
  sig({
    source: 'saju',
    layer: 'daily',
    polarity: 1,
    name: '癸巳 (식신)',
    kind: 'pillar-sibsin',
    evidence: { module: 'saju-pillar', sibsin: '식신', pillars: ['癸巳'], detail: {} },
  }),
  sig({
    source: 'saju',
    layer: 'daily',
    polarity: -2,
    name: '지지충 巳↔亥',
    kind: 'hyeongchung',
    korean: '지지충 巳↔亥 (년주)',
  }),
  sig({
    source: 'astro',
    layer: 'monthly',
    polarity: 2,
    name: 'Jupiter exalted',
    korean: 'Jupiter 엑잘테이션 (고양)',
  }),
  sig({
    source: 'astro',
    layer: 'yearly',
    polarity: -2,
    name: 'Saturn fall',
    korean: 'Saturn 폴 (추락)',
  }),
]

describe('deriveDayInterpretation', () => {
  it('fills the full per-day contract from a single cell', () => {
    const d = deriveDayInterpretation({ cell: cell(80, richSignals), natal, lang: 'ko' })
    expect(d.date).toBe('2026-05-18')
    expect(d.score).toBe(80)
    expect(d.titleKey).toBeTruthy()
    expect(d.descKey).toBeTruthy()
    expect(d.ganzhi).toBe('癸巳') // 일진 (daily pillar)
    expect(d.sajuFactorKeys.length).toBeGreaterThan(0)
    expect(d.astroFactorKeys.length).toBeGreaterThan(0)
    expect(d.transitSunSign).toBe('Taurus')
    // 운주기 — 대운(natal), 세운/월운/일진(layered signals)
    expect(d.longCycleContext?.daeun?.ganji).toBe('乙亥')
    expect(d.longCycleContext?.daeun?.ageStart).toBe(22)
    expect(d.longCycleContext?.sewoon?.ganji).toBe('乙巳')
    expect(d.longCycleContext?.iljin?.ganji).toBe('癸巳')
    // 충/합/형
    expect(d.cycleInteractions?.some((c) => c.kind === '지지충')).toBe(true)
  })

  it('splits saju vs astro axes from the same cell (no double computation)', () => {
    const d = deriveDayInterpretation({ cell: cell(70, richSignals), natal, lang: 'ko' })
    expect(d.scoreBreakdown).toBeDefined()
    // 사주축은 우호 신호가 많아 점성축(Saturn 폴 포함)보다 높아야 함
    expect(d.scoreBreakdown!.sajuAxis).toBeGreaterThan(d.scoreBreakdown!.astroAxis)
    expect(['aligned', 'mixed', 'opposed']).toContain(d.scoreBreakdown!.axisAgreement)
  })

  it('keeps verdict (title/desc) consistent with the injected grade', () => {
    const good = deriveDayInterpretation({
      cell: cell(90, richSignals),
      natal,
      lang: 'ko',
      grade: 0,
    })
    const bad = deriveDayInterpretation({
      cell: cell(20, richSignals),
      natal,
      lang: 'ko',
      grade: 4,
    })
    expect(good.titleKey).toBe('흐름이 가장 강한 날')
    expect(bad.titleKey).toBe('지키는 게 이기는 날')
    // 좋은 날 verdict 에 부정 문구 없음 / 나쁜 날 verdict 에 긍정 문구 없음
    const goodVerdict = `${good.titleKey} ${good.descKey}`
    const badVerdict = `${bad.titleKey} ${bad.descKey}`
    expect(/미루세요|약한 날|제동/.test(goodVerdict)).toBe(false)
    expect(/밀어붙이기|가장 강한/.test(badVerdict)).toBe(false)
  })

  it('naturalizes factor lines (no debug ↑/↓·[layer] prefix)', () => {
    const d = deriveDayInterpretation({ cell: cell(80, richSignals), natal, lang: 'ko' })
    for (const f of [...d.sajuFactorKeys, ...d.astroFactorKeys]) {
      expect(f.startsWith('↑')).toBe(false)
      expect(f.startsWith('↓')).toBe(false)
      expect(f.includes('[')).toBe(false)
    }
  })
})

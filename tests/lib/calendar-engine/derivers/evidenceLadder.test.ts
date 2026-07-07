import { describe, it, expect } from 'vitest'
import { deriveEvidenceLadder } from '@/lib/calendar-engine/derivers/evidenceLadder'
import type { ActiveSignal, SignalKind, SignalLayer, Polarity } from '@/lib/calendar-engine/types'

// 최소 ActiveSignal 팩토리 — ladder 는 layer/polarity/weight/kind/name/evidence 만 본다.
function sig(p: {
  id: string
  kind: SignalKind
  source?: 'saju' | 'astro'
  name: string
  korean?: string
  layer: SignalLayer
  polarity: Polarity
  weight: number
  sibsin?: string
  planets?: string[]
  aspectType?: string
}): ActiveSignal {
  return {
    id: p.id,
    source: p.source ?? (p.kind === 'transit' ? 'astro' : 'saju'),
    kind: p.kind,
    name: p.name,
    ...(p.korean ? { korean: p.korean } : {}),
    polarity: p.polarity,
    layer: p.layer,
    active: {
      start: '2026-07-15T00:00:00Z',
      peak: '2026-07-15T12:00:00Z',
      end: '2026-07-15T23:59:59Z',
    },
    weight: p.weight,
    evidence: {
      module: p.kind,
      detail: {},
      ...(p.sibsin ? { sibsin: p.sibsin } : {}),
      ...(p.planets ? { planets: p.planets } : {}),
      ...(p.aspectType ? { aspectType: p.aspectType } : {}),
    },
  } as ActiveSignal
}

describe('deriveEvidenceLadder', () => {
  const pillars = [
    sig({
      id: 'a',
      kind: 'pillar-sibsin',
      name: '甲午 (재성)',
      layer: 'decadal',
      polarity: 3,
      weight: 1.0,
      sibsin: '재성',
    }),
    sig({
      id: 'b',
      kind: 'pillar-sibsin',
      name: '丙寅 (정관)',
      layer: 'yearly',
      polarity: 2,
      weight: 0.85,
      sibsin: '정관',
    }),
    sig({
      id: 'c',
      kind: 'pillar-sibsin',
      name: '戊子 (편재)',
      layer: 'monthly',
      polarity: 1,
      weight: 0.7,
      sibsin: '편재',
    }),
    sig({
      id: 'd',
      kind: 'pillar-sibsin',
      name: '庚辰 (정재)',
      layer: 'daily',
      polarity: 3,
      weight: 0.55,
      sibsin: '정재',
    }),
  ]

  it('4개 시간층 = 4개 rung, 10년→올해→이달→오늘 순서', () => {
    const rungs = deriveEvidenceLadder(pillars, 'ko')
    expect(rungs.map((r) => r.scale)).toEqual(['decadal', 'yearly', 'monthly', 'daily'])
    expect(rungs.map((r) => r.scaleLabel)).toEqual(['10년', '올해', '이달', '오늘'])
  })

  it('결론에 전문어(십신 한자·통근 등) 없이 생활어, 십신은 칩으로 살린다', () => {
    const rungs = deriveEvidenceLadder(pillars, 'ko')
    const daily = rungs.find((r) => r.scale === 'daily')!
    // 결론엔 '정재' 같은 십신 원어가 그대로 노출되지 않는다(생활어).
    expect(daily.conclusion).not.toContain('정재')
    // 칩에는 십신 원어가 살아 있다.
    expect(daily.chips.some((c) => c.text === '정재' && c.source === 'saju')).toBe(true)
    expect(daily.polarity).toBe(3)
  })

  it('같은 층 점성 지배신호는 칩으로 합류(사주가 결론 backbone)', () => {
    const withAstro = [
      ...pillars,
      sig({
        id: 'v',
        kind: 'transit',
        name: 'Venus △ Venus',
        layer: 'monthly',
        polarity: 2,
        weight: 0.6,
        planets: ['Venus', 'Venus'],
        aspectType: 'trine',
      }),
    ]
    const rungs = deriveEvidenceLadder(withAstro, 'ko')
    const monthly = rungs.find((r) => r.scale === 'monthly')!
    expect(monthly.chips.some((c) => c.source === 'saju')).toBe(true)
    const astroChip = monthly.chips.find((c) => c.source === 'astro')
    expect(astroChip?.text).toBe('금성 △ 금성')
  })

  it('backbone 은 정통 십신 기둥만 — 12운성 전이/기신 같은 파생 pillar-sibsin 은 무시', () => {
    const mixed = [
      // 파생 라인(impact 큼) — name 이 '간지 (십신)' 정형이 아니므로 backbone 아님.
      sig({
        id: 'x1',
        kind: 'pillar-sibsin',
        name: '기신/구신 활성 — 甲申 대운',
        layer: 'decadal',
        polarity: -2,
        weight: 0.95,
      }),
      sig({
        id: 'x2',
        kind: 'pillar-sibsin',
        name: '본명 일지 양 → 대운 甲申 지지 임관',
        layer: 'decadal',
        polarity: 2,
        weight: 0.55,
      }),
      // 정통 십신 기둥(impact 작아도 이게 backbone) — polarity 0.
      sig({
        id: 'x3',
        kind: 'pillar-sibsin',
        name: '甲申 (비견)',
        layer: 'decadal',
        polarity: 0,
        weight: 0.95,
        sibsin: '비견',
      }),
    ]
    const rungs = deriveEvidenceLadder(mixed, 'ko', ['decadal'])
    expect(rungs).toHaveLength(1)
    // 파생 라인이 아니라 십신 '비견'이 칩 backbone.
    expect(rungs[0].chips[0]).toEqual({ text: '비견', source: 'saju' })
    expect(rungs[0].conclusion).not.toContain('기신')
  })

  it('EN 칩은 표준 영문 십신 라벨(SIBSIN_EN)', () => {
    const en = deriveEvidenceLadder(pillars, 'en')
    const daily = en.find((r) => r.scale === 'daily')!
    expect(daily.chips.some((c) => c.text === 'Direct Wealth')).toBe(true) // 정재
  })

  it('정적 본명(명사) 신호는 제외 — geokguk-status 는 사다리에 안 뜬다', () => {
    const withStatic = [
      sig({
        id: 's',
        kind: 'geokguk-status',
        name: '정인격 (성격)',
        layer: 'daily',
        polarity: 1,
        weight: 0.5,
      }),
    ]
    expect(deriveEvidenceLadder(withStatic, 'ko')).toHaveLength(0)
  })

  it('음(−) 지배는 마찰 결론 + polarity 음수', () => {
    const neg = [
      sig({
        id: 'n',
        kind: 'pillar-sibsin',
        name: '壬申 (편관)',
        layer: 'daily',
        polarity: -2,
        weight: 0.55,
        sibsin: '편관',
      }),
    ]
    const rungs = deriveEvidenceLadder(neg, 'ko')
    expect(rungs[0].polarity).toBe(-2)
    expect(rungs[0].conclusion).toContain('마찰')
  })

  it('scales 인자로 층 제한 — 월 카드는 daily 생략', () => {
    const rungs = deriveEvidenceLadder(pillars, 'ko', ['decadal', 'yearly', 'monthly'])
    expect(rungs.map((r) => r.scale)).toEqual(['decadal', 'yearly', 'monthly'])
  })

  it('결정론 — 같은 입력 같은 출력, EN 라벨 동반', () => {
    expect(deriveEvidenceLadder(pillars, 'ko')).toEqual(deriveEvidenceLadder(pillars, 'ko'))
    const en = deriveEvidenceLadder(pillars, 'en')
    expect(en.map((r) => r.scaleLabel)).toEqual(['10-yr', 'This year', 'This month', 'Today'])
  })
})

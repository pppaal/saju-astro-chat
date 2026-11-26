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
  english?: string
  module?: string
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
    ...(p.english ? { english: p.english } : {}),
    polarity: p.polarity,
    layer: p.layer,
    active: {
      start: '2026-07-15T00:00:00Z',
      peak: '2026-07-15T12:00:00Z',
      end: '2026-07-15T23:59:59Z',
    },
    weight: p.weight,
    evidence: {
      module: p.module ?? p.kind,
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

  it('R3: KO 칩이 True Node/Chiron 등 비-행성 포인트도 한글로 (영문 누출 방지)', () => {
    const sigs = [
      sig({
        id: 'p',
        kind: 'pillar-sibsin',
        name: '庚辰 (정재)',
        layer: 'daily',
        polarity: 0,
        weight: 0.55,
        sibsin: '정재',
      }),
      sig({
        id: 't',
        kind: 'transit',
        name: 'Venus △ True Node',
        layer: 'daily',
        polarity: 2,
        weight: 0.6,
        planets: ['Venus', 'True Node'],
        aspectType: 'trine',
      }),
    ]
    const daily = deriveEvidenceLadder(sigs, 'ko').find((r) => r.scale === 'daily')!
    const astroChip = daily.chips.find((c) => c.source === 'astro')!
    expect(astroChip.text).toBe('금성 △ 북교점')
    expect(astroChip.text).not.toMatch(/[A-Za-z]/)
  })

  it('R3: 중립 십신(polarity 0)은 강한 점성 driver 에 톤·결론을 양보(칩은 유지)', () => {
    const sigs = [
      // 중립 일진 십신
      sig({
        id: 'p',
        kind: 'pillar-sibsin',
        name: '庚辰 (비견)',
        layer: 'daily',
        polarity: 0,
        weight: 0.55,
        sibsin: '비견',
      }),
      // 같은 층 강한 흉 트랜짓
      sig({
        id: 't',
        kind: 'transit',
        name: 'Saturn □ Sun',
        layer: 'daily',
        polarity: -2,
        weight: 0.9,
        planets: ['Saturn', 'Sun'],
        aspectType: 'square',
      }),
    ]
    const daily = deriveEvidenceLadder(sigs, 'ko').find((r) => r.scale === 'daily')!
    expect(daily.polarity).toBe(-2) // 점성 driver 로 톤 양보
    expect(daily.chips.some((c) => c.source === 'saju' && c.text === '비견')).toBe(true) // 칩 유지
    expect(daily.conclusion).not.toContain('바탕 기운') // 중립 결론 아님
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

// astro-dignity 추출기 출력 모양 그대로(kind 'transit', name 에 한글 라벨, module 보존).
const venusDomicile = sig({
  id: 'astro.dignity.Venus|domicile|Libra.2026-07-01',
  kind: 'transit',
  module: 'astro-dignity',
  name: 'Venus 도미사일 (자기 자리) in Libra',
  korean: '금성 도미사일 (자기 자리) (천칭자리)',
  english: 'Venus in Domicile (home sign) (Libra) — operates at full natural strength',
  layer: 'monthly',
  polarity: 2,
  weight: 0.7,
  planets: ['Venus'],
})
const saturnFall = sig({
  id: 'astro.dignity.Saturn|fall|Aries.2026-07-01',
  kind: 'transit',
  module: 'astro-dignity',
  name: 'Saturn 폴 (추락) in Aries',
  korean: '토성 폴 (추락) (양자리)',
  english: 'Saturn in Fall (Aries) — is weakened and out of place',
  layer: 'yearly',
  polarity: -3,
  weight: 0.7,
})
const venusTriplicity = sig({
  id: 'astro.dignity.Venus|triplicity|Libra.2026-07-01',
  kind: 'transit',
  module: 'astro-dignity',
  name: 'Venus 트리플리시티 (Triplicity) in Libra',
  korean: '금성 트리플리시티 (Triplicity) (천칭자리)',
  english: 'Venus in minor dignity Triplicity (Libra) — a mild supportive placement',
  layer: 'monthly',
  polarity: 1,
  weight: 0.5,
})
// 본명 Almuten — 추출기 출력 그대로 kind 'natal-dignity'(정적 본명, G13). english 없음.
const natalAlmuten = sig({
  id: 'astro.dignity.natal-almuten.Venus.Libra.triplicity-term',
  kind: 'natal-dignity',
  source: 'astro',
  name: 'Natal Venus triplicity+term in Libra',
  korean: '본명 금성 5-tier 디그니티 (천칭자리)',
  layer: 'yearly',
  polarity: 2,
  weight: 0.4,
})
const marsConjMoon = sig({
  id: 't-mars-moon',
  kind: 'transit',
  name: 'Mars ☌ Moon',
  layer: 'monthly',
  polarity: -1,
  weight: 0.6,
  planets: ['Mars', 'Moon'],
  aspectType: 'conjunction',
})
const sajuMonthly = (polarity: Polarity) =>
  sig({
    id: `s-month-${polarity}`,
    kind: 'pillar-sibsin',
    name: polarity === 0 ? '戊子 (비견)' : '戊子 (편관)',
    layer: 'monthly',
    polarity,
    weight: 0.7,
    sibsin: polarity === 0 ? '비견' : '편관',
  })

const HANGUL = /[가-힣]/
const ASPECT_GLYPH = /[☌☍△□✶⚻⚺⚼]/

describe('deriveEvidenceLadder — 칩·결론 방향 일치 (B2 #7a)', () => {
  it('사주 −2 칸엔 같은 부호 점성 칩만 — 더 무거운 금성 위계 +2 대신 화성 ☌ 달 −1', () => {
    const sigs = [sajuMonthly(-2), venusDomicile, marsConjMoon]
    const en = deriveEvidenceLadder(sigs, 'en', ['monthly'])[0]
    expect(en.polarity).toBe(-2)
    expect(en.chips.find((c) => c.source === 'astro')?.text).toBe('Mars ☌ Moon')
    expect(en.chips.some((c) => /Venus/.test(c.text))).toBe(false)

    const ko = deriveEvidenceLadder(sigs, 'ko', ['monthly'])[0]
    expect(ko.chips.find((c) => c.source === 'astro')?.text).toBe('화성 ☌ 달')
    expect(ko.chips.some((c) => c.text.includes('금성'))).toBe(false)
  })

  it('같은 부호 점성 후보가 없으면 점성 칩을 생략한다(반대 부호 칩 금지)', () => {
    const rung = deriveEvidenceLadder([sajuMonthly(-2), venusDomicile], 'en', ['monthly'])[0]
    expect(rung.polarity).toBe(-2)
    expect(rung.chips.map((c) => c.source)).toEqual(['saju'])
  })

  it('사주 결론이 중립(0)일 때만 예전처럼 부호 무관 최강 점성(양보)', () => {
    const sigs = [sajuMonthly(0), venusDomicile, marsConjMoon]
    const rung = deriveEvidenceLadder(sigs, 'en', ['monthly'])[0]
    expect(rung.polarity).toBe(2)
    expect(rung.chips.find((c) => c.source === 'astro')?.text).toBe(
      'Venus in Domicile (home sign) (Libra)'
    )
  })
})

describe('deriveEvidenceLadder — 위계(dignity) 칩 i18n (B2 #7b)', () => {
  const sajuYearlyNeg = sig({
    id: 's-year',
    kind: 'pillar-sibsin',
    name: '丙寅 (편관)',
    layer: 'yearly',
    polarity: -2,
    weight: 0.85,
    sibsin: '편관',
  })
  const cases: ActiveSignal[][] = [
    [saturnFall],
    [sajuYearlyNeg, saturnFall],
    [venusDomicile],
    [venusTriplicity],
  ]

  it('EN 칩·결론에 한글이 없다 — english 머리를 쓴다', () => {
    for (const sigs of cases) {
      const rungs = deriveEvidenceLadder(sigs, 'en')
      expect(rungs.length).toBeGreaterThan(0)
      for (const r of rungs) {
        expect(r.conclusion).not.toMatch(HANGUL)
        for (const c of r.chips) expect(c.text, c.text).not.toMatch(HANGUL)
      }
    }
    const yearly = deriveEvidenceLadder([saturnFall], 'en', ['yearly'])[0]
    expect(yearly.chips[0].text).toBe('Saturn in Fall (Aries)')
    expect(yearly.conclusion).toBe('Saturn in Fall (Aries) sets the tone for this year')
  })

  it('본명 Almuten(natal-dignity)은 정적 본명 — 사다리에 안 뜨고 다른 칩도 밀어내지 않는다', () => {
    expect(deriveEvidenceLadder([natalAlmuten], 'en')).toHaveLength(0)
    expect(deriveEvidenceLadder([natalAlmuten], 'ko')).toHaveLength(0)
    // 같은 층(yearly)의 진짜 하늘 신호(토성 폴)가 그대로 칩이 된다 — 본명 +2 가 끼어들지 않는다.
    const yearly = deriveEvidenceLadder([natalAlmuten, saturnFall], 'en', ['yearly'])[0]
    expect(yearly.chips.map((c) => c.text)).toEqual(['Saturn in Fall (Aries)'])
    expect(yearly.polarity).toBe(-3)
  })

  it('KO 칩은 글로스 괄호를 뗀 짧은 한글 라벨 — 영문이 섞이지 않는다', () => {
    const koChip = (s: ActiveSignal) =>
      deriveEvidenceLadder([s], 'ko')[0].chips.find((c) => c.source === 'astro')!.text
    expect(koChip(saturnFall)).toBe('토성 폴 (양자리)')
    expect(koChip(venusDomicile)).toBe('금성 도미사일 (천칭자리)')
    expect(koChip(venusTriplicity)).toBe('금성 트리플리시티 (천칭자리)')
    for (const s of [saturnFall, venusDomicile, venusTriplicity]) {
      expect(koChip(s)).not.toMatch(/[A-Za-z]/)
    }
  })
})

describe('deriveEvidenceLadder — EN 결론은 각 기호를 말로 (FIX9b F10)', () => {
  it("EN 결론은 'trine' — '△' 가 아니다(칩은 기호 유지)", () => {
    const venusTrine = sig({
      id: 't-vv',
      kind: 'transit',
      name: 'Venus △ Venus',
      layer: 'daily',
      polarity: 2,
      weight: 0.6,
      planets: ['Venus', 'Venus'],
      aspectType: 'trine',
    })
    const en = deriveEvidenceLadder([venusTrine], 'en', ['daily'])[0]
    expect(en.conclusion).toBe('Venus trine Venus sets the tone for today')
    expect(en.conclusion).not.toMatch(ASPECT_GLYPH)
    expect(en.chips[0].text).toBe('Venus △ Venus')
    // KO 결론은 이번 변경 범위 밖 — 그대로.
    expect(deriveEvidenceLadder([venusTrine], 'ko', ['daily'])[0].conclusion).toContain(
      '금성 △ 금성'
    )
  })

  it('evidence 가 빠진 월 셀(name 폴백)에서도 square·conjunct 로 푼다', () => {
    const stripped = (name: string, polarity: Polarity) =>
      sig({ id: `x-${name}`, kind: 'transit', name, layer: 'daily', polarity, weight: 0.6 })
    expect(deriveEvidenceLadder([stripped('Saturn □ Sun', -2)], 'en')[0].conclusion).toBe(
      'Saturn square Sun sets the tone for today'
    )
    expect(deriveEvidenceLadder([stripped('Mars ☌ Moon', -1)], 'en')[0].conclusion).toBe(
      'Mars conjunct Moon sets the tone for today'
    )
  })
})

describe('deriveEvidenceLadder — 이달 마찰 꼬리 (B2 #7d)', () => {
  it("EN 'a sticking point this month', KO 짝 '이달 걸리는 지점' — 'rough patch' 과장 없음", () => {
    const en = deriveEvidenceLadder([sajuMonthly(-2)], 'en', ['monthly'])[0].conclusion
    const ko = deriveEvidenceLadder([sajuMonthly(-2)], 'ko', ['monthly'])[0].conclusion
    expect(en).toContain('a sticking point this month')
    expect(en).not.toContain('rough patch')
    expect(ko).toContain('이달 걸리는 지점')
    expect(ko).not.toContain('삐걱')
  })
})

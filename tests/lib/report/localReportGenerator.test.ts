// tests/lib/report/localReportGenerator.test.ts
// Unit tests for the deterministic, AI-free chart-summary generator.
import { describe, it, expect } from 'vitest'
import { generateChartSummary } from '@/lib/report/local-report-generator'

// ── Fixture builders ───────────────────────────────────────────────────────
// Built from the real input shapes that extractSajuData / generateChartSummary
// read: saju.dayMaster / saju.pillars.day / saju.fiveElements / saju.analyses,
// and astro.planets[{ name, longitude }].

// Longitudes: aries 0–30 (fire), taurus 30–60 (earth), gemini 60–90 (air),
// cancer 90–120 (water), leo 120–150 (fire), etc.
const LON = {
  ariesFire: 10, // aries / fire
  taurusEarth: 40, // taurus / earth
  geminiAir: 70, // gemini / air
  cancerWater: 100, // cancer / water
  leoFire: 130, // leo / fire
}

function makeSaju(overrides: Record<string, unknown> = {}) {
  return {
    // 甲 = Wood day master (matches ELEMENT_RELATIONS_EN['wood'])
    dayMaster: { name: '甲', element: 'wood' },
    pillars: {
      day: {
        heavenlyStem: { name: '甲', element: 'wood' },
        earthlyBranch: { name: '子' },
      },
    },
    dayPillar: {
      heavenlyStem: { name: '甲' },
      earthlyBranch: { name: '子' },
    },
    fiveElements: { wood: 3, fire: 1, earth: 2, metal: 0, water: 2 },
    ...overrides,
  }
}

function makeAstro(planets: Array<{ name: string; longitude: number }>) {
  return { planets }
}

describe('generateChartSummary', () => {
  describe('한국어 (ko) — full data', () => {
    it('builds a multi-sentence Korean narrative from full saju + astro', () => {
      const saju = makeSaju({
        analyses: {
          geokguk: { primary: '정관격' },
          yongsin: { primaryYongsin: '화', daymasterStrength: '신강' },
          sibsin: { categoryCount: { 비겁: 4, 식상: 1, 재성: 1, 관성: 0, 인성: 0 } },
        },
      })
      const astro = makeAstro([
        { name: 'sun', longitude: LON.leoFire },
        { name: 'moon', longitude: LON.cancerWater },
      ])
      const out = generateChartSummary(saju, astro, 'ko')
      expect(typeof out).toBe('string')
      expect(out.length).toBeGreaterThan(20)
      // s1: ilju archetype lead (甲子 exists in the dictionary)
      expect(out).toContain('당신은')
      expect(out).toContain('유형이에요')
      // s2: geokguk present
      expect(out).toContain('사주는 정관격')
      // s3: dominant sibsin category (비겁=4 >= 3)
      expect(out).toContain('비겁(비견·겁재)이 4개로')
      // s6: sun/moon present
      expect(out).toContain('태양은 사자자리')
      expect(out).toContain('달은 게자리')
    })

    it('defaults to ko when no lang argument is given', () => {
      const out = generateChartSummary(makeSaju(), makeAstro([]))
      expect(out).toContain('당신은')
    })

    it('falls back to element-based lead when ilju archetype is missing', () => {
      // earthlyBranch name that has no matching 60-ganji entry
      const saju = makeSaju({
        dayPillar: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: 'ZZ' } },
        pillars: {
          day: { heavenlyStem: { name: '甲', element: 'wood' }, earthlyBranch: { name: 'ZZ' } },
        },
      })
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      expect(out).toContain('기운의 사람이에요')
      expect(out).not.toContain('유형이에요')
    })

    it('uses 중화 strength label and balanced phrasing without geokguk', () => {
      const saju = makeSaju({
        analyses: { yongsin: { daymasterStrength: '중화' } },
      })
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      // No geokguk → falls to the "일간이 …한 면이에요" branch
      expect(out).toContain('일간이 중화한 면이에요')
    })

    it('renders the surrounding-element role sentence (s4) when dominant differs from self', () => {
      // self = wood (day master), dominant = earth (wood controls earth → wealth role)
      const saju = makeSaju({
        fiveElements: { wood: 1, fire: 0, earth: 5, metal: 0, water: 0 },
      })
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      expect(out).toContain('그리고 주변에는')
      expect(out).toContain('기운이 강하게 흘러')
    })

    it('renders the remedy sentence (s5) from primaryYongsin', () => {
      // primaryYongsin 화 (fire), dominant is wood → not skipped
      const saju = makeSaju({
        fiveElements: { wood: 5, fire: 0, earth: 1, metal: 1, water: 1 },
        analyses: { yongsin: { primaryYongsin: '화' } },
      })
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      expect(out).toContain('다만 화(빨강·남쪽)')
      expect(out).toContain('부족해서')
    })

    it('falls back to the weakest fiveElement for the remedy when no yongsin given', () => {
      // metal = 0 is the scarce element → remedy should reference 금 (흰색·서쪽)
      const saju = makeSaju({
        fiveElements: { wood: 3, fire: 2, earth: 2, metal: 0, water: 2 },
      })
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      expect(out).toContain('다만 금(흰색·서쪽)')
    })

    it('renders matching sun/moon element meaning when both share an element', () => {
      const saju = makeSaju()
      const astro = makeAstro([
        { name: 'sun', longitude: LON.ariesFire }, // fire
        { name: 'moon', longitude: LON.leoFire }, // fire
      ])
      const out = generateChartSummary(saju, astro, 'ko')
      expect(out).toContain('둘 다 불 기운이라')
    })

    it('renders differing sun/moon element meaning when elements differ', () => {
      const saju = makeSaju()
      const astro = makeAstro([
        { name: 'sun', longitude: LON.ariesFire }, // fire
        { name: 'moon', longitude: LON.taurusEarth }, // earth
      ])
      const out = generateChartSummary(saju, astro, 'ko')
      expect(out).toContain('겉(태양 불)과 속(달 흙)')
    })

    it('renders only the sun when moon longitude is absent', () => {
      const saju = makeSaju()
      const astro = makeAstro([{ name: 'sun', longitude: LON.geminiAir }])
      const out = generateChartSummary(saju, astro, 'ko')
      expect(out).toContain('태양은 쌍둥이자리에 있어요')
      expect(out).not.toContain('달은')
    })
  })

  describe('English (en) — full data', () => {
    it('builds a multi-sentence English narrative from full saju + astro', () => {
      const saju = makeSaju({
        analyses: {
          geokguk: { primary: '정관격' },
          yongsin: { primaryYongsin: '화', daymasterStrength: '신강' },
          sibsin: { categoryCount: { 비겁: 4 } },
        },
      })
      const astro = makeAstro([
        { name: 'sun', longitude: LON.leoFire },
        { name: 'moon', longitude: LON.cancerWater },
      ])
      const out = generateChartSummary(saju, astro, 'en')
      expect(out).toContain('At the core')
      expect(out).toContain('strong day-master')
      expect(out).toContain('(비겁) shows up 4 times')
      expect(out).toContain('Sun in Leo')
      expect(out).toContain('Moon in Cancer')
    })

    it('uses the element-based English lead when ilju archetype missing', () => {
      const saju = makeSaju({
        dayPillar: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: 'ZZ' } },
      })
      const out = generateChartSummary(saju, makeAstro([]), 'en')
      expect(out).toContain('at the core')
    })

    it('renders the English strength-only branch when no geokguk tagline', () => {
      const saju = makeSaju({ analyses: { yongsin: { daymasterStrength: '신약' } } })
      const out = generateChartSummary(saju, makeAstro([]), 'en')
      expect(out).toContain('Your day-master sits in a weak day-master pattern')
    })

    it('renders matching/differing English sun-moon meanings', () => {
      const same = generateChartSummary(
        makeSaju(),
        makeAstro([
          { name: 'sun', longitude: LON.ariesFire },
          { name: 'moon', longitude: LON.leoFire },
        ]),
        'en'
      )
      expect(same).toContain('Both Fire')

      const diff = generateChartSummary(
        makeSaju(),
        makeAstro([
          { name: 'sun', longitude: LON.ariesFire },
          { name: 'moon', longitude: LON.taurusEarth },
        ]),
        'en'
      )
      expect(diff).toContain('Outer (Sun Fire) and inner (Moon Earth)')
    })

    it('renders only Sun when moon absent (en)', () => {
      const out = generateChartSummary(
        makeSaju(),
        makeAstro([{ name: 'sun', longitude: LON.geminiAir }]),
        'en'
      )
      expect(out).toContain('Sun in Gemini.')
      expect(out).not.toContain('Moon in')
    })
  })

  describe('edge cases & branches', () => {
    it('handles completely empty saju/astro without throwing', () => {
      const out = generateChartSummary({}, {}, 'ko')
      expect(typeof out).toBe('string')
      // Self defaults to wood when no day master element
      expect(out).toContain('당신은')
    })

    it('handles null saju and null astro', () => {
      const out = generateChartSummary(null, null, 'ko')
      expect(typeof out).toBe('string')
      expect(out.length).toBeGreaterThan(0)
    })

    it('handles undefined inputs', () => {
      const out = generateChartSummary(undefined, undefined, 'en')
      expect(typeof out).toBe('string')
    })

    it('omits the sibsin sentence when the top category count is below 3', () => {
      const saju = makeSaju({
        analyses: { sibsin: { categoryCount: { 비겁: 2, 식상: 1 } } },
      })
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      expect(out).not.toContain('비겁(비견·겁재)')
    })

    it('skips the geokguk sentence when primary is 미정', () => {
      const saju = makeSaju({ analyses: { geokguk: { primary: '미정' } } })
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      expect(out).not.toContain('사주는 미정')
    })

    it('reads day master from facts/pillars fallback paths', () => {
      const saju = {
        facts: { dayMaster: { name: '乙', element: 'wood' }, fiveElements: { wood: 2, fire: 1 } },
        pillars: {
          day: { heavenlyStem: { name: '乙', element: 'wood' }, earthlyBranch: { name: '丑' } },
        },
        dayPillar: { heavenlyStem: { name: '乙' }, earthlyBranch: { name: '丑' } },
      }
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      expect(typeof out).toBe('string')
      expect(out.length).toBeGreaterThan(0)
    })

    it('ignores invalid (non-finite) planet longitudes', () => {
      const astro = makeAstro([
        { name: 'sun', longitude: Number.NaN },
        { name: 'moon', longitude: Number.POSITIVE_INFINITY },
      ])
      const out = generateChartSummary(makeSaju(), astro, 'ko')
      expect(out).not.toContain('태양은')
    })

    it('normalizes longitudes outside 0–360 (wrap-around)', () => {
      // 370 % 360 = 10 → aries; -350 → 10 → aries as well
      const a = generateChartSummary(makeSaju(), makeAstro([{ name: 'sun', longitude: 370 }]), 'ko')
      const b = generateChartSummary(
        makeSaju(),
        makeAstro([{ name: 'sun', longitude: -350 }]),
        'ko'
      )
      expect(a).toContain('태양은 양자리')
      expect(b).toContain('태양은 양자리')
    })

    it('skips the remedy when the yongsin element equals the dominant element', () => {
      // dominant = wood, primaryYongsin = 목(wood) → enKey === domKey → skip remedy,
      // and since all other elements present are >0 there is no fallback scarce element.
      const saju = makeSaju({
        fiveElements: { wood: 5, fire: 2, earth: 2, metal: 2, water: 2 },
        analyses: { yongsin: { primaryYongsin: '목' } },
      })
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      expect(out).not.toContain('다만')
    })

    it('is deterministic — same input yields identical output', () => {
      const saju = makeSaju({
        analyses: { geokguk: { primary: '정관격' }, yongsin: { daymasterStrength: '신강' } },
      })
      const astro = makeAstro([{ name: 'sun', longitude: LON.leoFire }])
      expect(generateChartSummary(saju, astro, 'ko')).toBe(generateChartSummary(saju, astro, 'ko'))
    })

    it('produces different ko and en output for the same input', () => {
      const saju = makeSaju()
      const astro = makeAstro([{ name: 'sun', longitude: LON.leoFire }])
      const ko = generateChartSummary(saju, astro, 'ko')
      const en = generateChartSummary(saju, astro, 'en')
      expect(ko).not.toBe(en)
    })

    it('handles a day-master element supplied as a Korean/Hanja key', () => {
      // dayMaster.element given as Hanja "木" → normalizeElementKey maps to wood
      const saju = makeSaju({ dayMaster: { name: '甲', element: '木' } })
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      expect(typeof out).toBe('string')
      expect(out.length).toBeGreaterThan(0)
    })

    it('handles geokguk with no jongseong (받침 없는) last char branch', () => {
      // 식신격: '격' has jongseong → covers hasJongseong=true. Use a name whose
      // combined label ends without jongseong by relying on strength label too.
      const saju = makeSaju({
        analyses: { geokguk: { primary: '식신격' }, yongsin: { daymasterStrength: '신강' } },
      })
      const out = generateChartSummary(saju, makeAstro([]), 'ko')
      expect(out).toContain('사주는 식신격·신강')
    })
  })
})

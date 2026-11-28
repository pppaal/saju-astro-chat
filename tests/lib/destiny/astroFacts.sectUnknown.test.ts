/**
 * astroFacts — 정오 앵커·기본 좌표로 섹트와 연주(Lord of the Year)를 지어내지 않는다
 * (F5, OD-5 — 오너 결정 9).
 *
 *  - 출생시각 미상 → hellenistic.sect = null (예전엔 정오 태양이라 거의 늘 'day').
 *    섹트에 기대는 삼분성은 참여(participating) 지배성만, lot·ZR·Almuten 은 비운다.
 *  - 출생지만 미상(시각은 앎) → 존 기준점의 태양 고도로 섹트를 유지하되 |고도| < 3° 면 null.
 *  - placeUnreliable → profection.activatedHouse·activatedSign·lordOfYear = null (나이만 남김).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const altitude = vi.hoisted(() => ({ value: null as number | null }))
vi.mock('@/lib/astrology/foundation/extraPoints', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/astrology/foundation/extraPoints')>()
  return { ...orig, sunTrueAltitude: vi.fn(() => altitude.value) }
})

const { collectAstroFacts, maskSectDependentHellenistic, sectUnreliable, SECT_HORIZON_MARGIN_DEG } =
  await import('@/lib/destiny/astroFacts')
const { TRIPLICITY } = await import('@/lib/astrology/foundation/dignities')
type Hellenistic = import('@/lib/destiny/astroFacts').AstroHellenisticFacts

const NOW = new Date('2026-11-25T00:00:00Z')
const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
  includeHellenistic: true,
}

const ELEMENT_OF: Record<string, keyof typeof TRIPLICITY> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

beforeEach(() => {
  altitude.value = null
})

describe('collectAstroFacts — 출생시각 미상이면 섹트 null', () => {
  it('sect null, lot·ZR·Almuten 비움, 삼분성은 참여 지배성만', async () => {
    const f = await collectAstroFacts({ ...BIRTH, birthTime: '12:00', birthTimeUnknown: true }, NOW)
    const h = f!.hellenistic!
    expect(h.sect).toBeNull()
    expect(h.lots).toEqual([])
    expect(h.zodiacalReleasing).toEqual({ spirit: null, fortune: null })
    expect(h.almutenFiguris).toBeNull()
    expect(h.dignities.length).toBeGreaterThan(0)
    for (const d of h.dignities) {
      const el = ELEMENT_OF[d.sign]
      if (!el) continue
      expect(d.tiers.triplicity).toBe(TRIPLICITY[el].participating === d.planet)
    }
  })

  it('시각·출생지를 알면 섹트는 day/night 그대로(대조군)', async () => {
    const f = await collectAstroFacts(BIRTH, NOW)
    expect(['day', 'night']).toContain(f!.hellenistic!.sect)
    expect(f!.hellenistic!.lots.length).toBeGreaterThan(0)
  })
})

describe('collectAstroFacts — 출생지만 미상이면 존 기준점 태양 고도로', () => {
  it(`|고도| ≥ ${SECT_HORIZON_MARGIN_DEG}° → 섹트 유지`, async () => {
    altitude.value = 25
    const f = await collectAstroFacts({ ...BIRTH, birthCityUnknown: true }, NOW)
    expect(['day', 'night']).toContain(f!.hellenistic!.sect)
  })

  it(`|고도| < ${SECT_HORIZON_MARGIN_DEG}° → 섹트 null`, async () => {
    altitude.value = -1.5
    const f = await collectAstroFacts({ ...BIRTH, birthCityUnknown: true }, NOW)
    expect(f!.hellenistic!.sect).toBeNull()
  })
})

describe('sectUnreliable', () => {
  const at = { latitude: 37.5665, longitude: 126.978 }
  it('시각 미상이면 고도와 무관하게 true', () => {
    altitude.value = 40
    expect(sectUnreliable({ ...at, birthTimeUnknown: true }, 2_450_000)).toBe(true)
  })
  it('둘 다 알면 false', () => {
    expect(sectUnreliable(at, 2_450_000)).toBe(false)
  })
  it('출생지만 미상: 3° 경계와 고도 미상', () => {
    altitude.value = 3
    expect(sectUnreliable({ ...at, birthCityUnknown: true }, 2_450_000)).toBe(false)
    altitude.value = -2.99
    expect(sectUnreliable({ ...at, birthCityUnknown: true }, 2_450_000)).toBe(true)
    altitude.value = null
    expect(sectUnreliable({ ...at, birthCityUnknown: true }, 2_450_000)).toBe(true)
    altitude.value = 30
    expect(sectUnreliable({ ...at, birthCityUnknown: true }, undefined)).toBe(true)
  })
})

describe('maskSectDependentHellenistic', () => {
  const tiers = {
    domicile: false,
    exaltation: true,
    triplicity: true,
    term: false,
    face: false,
    detriment: false,
    fall: false,
  }
  const h: Hellenistic = {
    sect: 'day',
    natalAspects: [],
    lots: [{ name: 'Fortune', sign: 'Leo', longitude: 130, degreeInSign: 10, house: 2 }] as never,
    zodiacalReleasing: { spirit: { startSign: 'Leo', periods: [] }, fortune: null } as never,
    // 양자리 태양 = 불 원소 낮 지배성(섹트 의존), 양자리 토성 = 참여 지배성(섹트 무관).
    dignities: [
      { planet: 'Sun', sign: 'Aries', degree: 5, tiers, score: 1.5 },
      { planet: 'Saturn', sign: 'Aries', degree: 25, tiers: { ...tiers, exaltation: false } },
    ] as never,
    almutenFiguris: { winner: 'Mars', winners: ['Mars'], scores: { Mars: 9 } } as never,
  }

  it('섹트 null, 낮/밤 삼분성 제거·점수 재계산, 참여 삼분성 유지, lot·ZR·Almuten 비움', () => {
    const m = maskSectDependentHellenistic(h)
    expect(m.sect).toBeNull()
    expect(m.dignities[0].tiers.triplicity).toBe(false)
    expect(m.dignities[0].score).toBe(1) // exaltation 만
    expect(m.dignities[1].tiers.triplicity).toBe(true)
    expect(m.lots).toEqual([])
    expect(m.zodiacalReleasing).toEqual({ spirit: null, fortune: null })
    expect(m.almutenFiguris).toBeNull()
    // 캐시 값(입력)은 건드리지 않는다
    expect(h.sect).toBe('day')
    expect(h.dignities[0].tiers.triplicity).toBe(true)
  })
})

describe('collectAstroFacts — placeUnreliable 이면 프로펙션 활성 하우스·사인·연주 null', () => {
  it.each([
    ['출생시각 미상', { birthTime: '12:00', birthTimeUnknown: true }],
    ['출생지 미상', { birthCityUnknown: true }],
  ])('%s → 나이만 남는다', async (_l, over) => {
    const f = await collectAstroFacts({ ...BIRTH, ...over }, NOW)
    const p = f!.profection!
    expect(p.age).toBe(31)
    expect(p.activatedHouse).toBeNull()
    expect(p.activatedSign).toBeNull()
    expect(p.lordOfYear).toBeNull()
    expect(p.lordPlacement).toBeNull()
  })

  it('둘 다 알면 활성 하우스·연주가 그대로(대조군)', async () => {
    const p = (await collectAstroFacts(BIRTH, NOW))!.profection!
    expect(p.age).toBe(31)
    expect(p.activatedHouse).toBe((31 % 12) + 1)
    expect(p.activatedSign).toBeTruthy()
    expect(p.lordOfYear).toBeTruthy()
  })
})

/**
 * astroDetail — '왜' 근거의 점성 부모 구조. 교차가 싣고 온 엔진의 부모 참조(crossParents)를
 * 그대로 옮긴다 — 월 셀(evidence 비움)·오늘 셀 모두 같은 값, 이름·창으로 추정하는 길은 없다.
 * 실제 천체력 값(11-17 Sun □ Moon, 11-19 트랜짓 태양 전갈자리)과 표본 30일 전부의 참조는
 * calendarSample.real.node.test.ts 가 본다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActiveSignal } from '@/lib/calendar-engine/types'

/** 줄바꿈 없는 공백(값 조각 안, VC-8)을 보통 공백으로 — 글자 비교용. */
const spaced = (t: string) => t.replace(/\u00A0/g, ' ')

const chartFor = vi.fn()
vi.mock('@/lib/calendar-engine/ephe-cache', () => ({
  getCachedTransitChart: (args: { iso: string }) => chartFor(args),
}))

const astroDetailModule = await import('@/lib/calendar-view/astroDetail')
const {
  parseTransitName,
  astroPlanetOf,
  reasonAstroDetail,
  withReasonDetail,
  withTransitPositions,
  natalPointLongitudes,
  orbAtInstant,
  astroDetailSub,
  planetGlyph,
  MOON_PHASE_WORD,
} = astroDetailModule
const { getMoonPhaseName } = await import('@/lib/astrology/foundation/electional')
type MoonPhase = Parameters<typeof getMoonPhaseName>[0]

const stripped = { module: 'astro-transit', detail: {} }

function sig(p: Partial<ActiveSignal> & Pick<ActiveSignal, 'id' | 'name'>): ActiveSignal {
  return {
    source: 'astro',
    kind: 'transit',
    polarity: 0,
    layer: 'daily',
    weight: 0.5,
    active: {
      start: '2026-11-16T12:00:00.000Z',
      peak: '2026-11-19T12:00:00.000Z',
      end: '2026-11-25T12:00:00.000Z',
    },
    evidence: stripped,
    ...p,
  }
}

/**
 * 2026-11-17 월 셀 모양(stripEvidence) — 상관 × 태양 daily 교차와 태양 후보들. 교차는 evidence 가
 * 비어도 최상위 crossParents(엔진이 적은 부모 참조)를 싣고 있다.
 */
const CROSS_17 = sig({
  id: 'cross.상관-x-Sun.daily:2026-11-17~2026-11-17',
  name: '상관 × 태양',
  source: 'saju',
  kind: 'cross-activation',
  polarity: -2,
  active: {
    start: '2026-11-17T00:00:00.000Z',
    peak: '2026-11-17T12:00:00.000Z',
    end: '2026-11-17T23:59:59.999Z',
  },
  evidence: { module: 'cross-activation', detail: {} },
  crossParents: {
    saju: 'saju.pillar.daily.2026-11-17',
    astro: 'astro.transit.Sun|Moon|square.2026-11-16',
    planet: 'Sun',
    kind: 'transit',
    layer: 'daily',
    aspect: 'square',
    natal: 'Moon',
    orb: 0.49,
  },
})
const CELL_17 = {
  signals: [
    sig({
      id: 'astro.transit.Sun|Moon|square.2026-11-16',
      name: 'Sun □ Moon',
      polarity: -1,
      weight: 0.7,
    }),
    sig({
      id: 'astro.transit.Sun|True Node|sextile.2026-11-17',
      name: 'Sun ✶ True Node',
      polarity: 1,
      weight: 0.59,
    }),
    sig({
      id: 'astro.transit.Sun|Venus|trine.2026-11-15',
      name: 'Sun △ Venus',
      polarity: 2,
      weight: 0.69,
    }),
    sig({
      id: 'astro.planetary-hour.2026-11-17.H01.Sun',
      name: 'Sun hour',
      kind: 'planetary-hour',
      layer: 'hourly',
      polarity: -1,
      weight: 0.9,
    }),
    sig({
      id: 'astro.transit.Mars|Moon|conjunction.2026-11-09',
      name: 'Mars ☌ Moon',
      polarity: -1,
      layer: 'monthly',
    }),
    CROSS_17,
  ],
}

describe('signal readers', () => {
  it('parseTransitName — 트랜짓 이름 규약을 거꾸로(두 단어 접점 포함)', () => {
    expect(parseTransitName('Sun □ Moon')).toEqual({
      transitPlanet: 'Sun',
      aspect: 'square',
      natalPoint: 'Moon',
    })
    expect(parseTransitName('Neptune ☍ True Node')).toEqual({
      transitPlanet: 'Neptune',
      aspect: 'opposition',
      natalPoint: 'True Node',
    })
    expect(parseTransitName('Saturn 폴 (추락) in Aries')).toBeNull()
  })

  it('astroPlanetOf — evidence 가 비어도 id·이름에서, 상징 kind 는 undefined', () => {
    expect(astroPlanetOf(CELL_17.signals[0])).toBe('Sun')
    expect(
      astroPlanetOf(
        sig({ id: 'astro.dignity.Saturn|fall|Aries.2026-02-14', name: 'Saturn 폴 (추락) in Aries' })
      )
    ).toBe('Saturn')
    expect(
      astroPlanetOf(
        sig({
          id: 'astro.lifecycle.saturn_return_1',
          name: '첫 토성 회귀',
          kind: 'lifecycle',
          layer: 'decadal',
        })
      )
    ).toBe('Saturn')
    expect(
      astroPlanetOf(
        sig({
          id: 'astro.house-transit.Mars.1.2026-10-16',
          name: 'Mars in 1H',
          kind: 'house-transit',
        })
      )
    ).toBe('Mars')
    expect(astroPlanetOf(CELL_17.signals[3])).toBeUndefined() // planetary-hour
    expect(
      astroPlanetOf(
        sig({
          id: 'astro.zr.spirit.l1.3.Taurus',
          name: 'ZR Spirit L1: Taurus (Venus, 8년)',
          kind: 'zodiacal-releasing',
        })
      )
    ).toBeUndefined()
  })
})

describe('reasonAstroDetail — 엔진의 부모 참조(crossParents)를 그대로', () => {
  it('11-17 상관 × 태양 ▼ → Sun □ Moon 의 구조(evidence 없는 월 셀에서도 orb 까지)', () => {
    expect(reasonAstroDetail(CROSS_17)).toEqual({
      transitPlanet: 'Sun',
      sourceKind: 'transit',
      aspect: 'square',
      natalPoint: 'Moon',
      orb: 0.49,
    })
  })

  it('트랜짓이 아닌 부모(하우스 오버레이·품위)는 행성·종류만', () => {
    const cross = sig({
      id: 'cross.편재-x-Mars.daily:2026-11-08~2026-11-08',
      name: '편재 × 화성',
      source: 'saju',
      kind: 'cross-activation',
      polarity: -1,
      evidence: { module: 'cross-activation', detail: {} },
      crossParents: {
        saju: 'saju.pillar.daily.2026-11-08',
        astro: 'astro.house-transit.Mars.1.2026-10-16',
        planet: 'Mars',
        kind: 'house-transit',
        layer: 'monthly',
      },
    })
    expect(reasonAstroDetail(cross)).toEqual({ transitPlanet: 'Mars', sourceKind: 'house-transit' })
    expect(
      reasonAstroDetail({
        crossParents: {
          ...cross.crossParents!,
          kind: 'dignity',
          astro: 'astro.dignity.Mars|face|Leo.2026-11-04',
        },
      })
      // 품위 부모는 부모 id 의 품위 키를 성격으로(QA VC-5 — 같은 행성의 두 교차를 구별).
    ).toEqual({ transitPlanet: 'Mars', sourceKind: 'dignity', qualifier: 'face' })
  })

  it('어스펙트 없는 부모의 성격 — 품위 · 달 위상 키는 부모 id 에서만(QA VC-5)', () => {
    const ref = (astro: string, kind: string, extra: Record<string, unknown> = {}) => ({
      crossParents: {
        saju: 'saju.pillar.daily.2026-11-24',
        astro,
        planet: 'Moon',
        kind,
        layer: 'monthly' as const,
        ...extra,
      },
    })
    expect(
      reasonAstroDetail(ref('astro.moon-phase.2026-11-22.waxing_gibbous', 'moon-phase'))
    ).toEqual({ transitPlanet: 'Moon', sourceKind: 'moon-phase', qualifier: 'waxing_gibbous' })
    expect(
      reasonAstroDetail(ref('astro.dignity.Moon|exaltation|Taurus.2026-11-23', 'dignity'))
        ?.qualifier
    ).toBe('exaltation')
    // 모르는 키·다른 모양의 id 는 성격 없음(지어내지 않는다).
    expect(
      reasonAstroDetail(ref('astro.moon-phase.2026-11-22.blue_moon', 'moon-phase'))
    ).not.toHaveProperty('qualifier')
    expect(
      reasonAstroDetail(ref('astro.dignity.natal-almuten.Moon.Taurus.x.2026', 'dignity'))
    ).not.toHaveProperty('qualifier')
    // 트랜짓(어스펙트) 부모는 성격을 싣지 않는다 — 어스펙트·본명 접점이 그 자리.
    expect(
      reasonAstroDetail(
        ref('astro.moon-phase.2026-11-22.full_moon', 'transit', {
          aspect: 'square',
          natal: 'Mars',
        })
      )
    ).not.toHaveProperty('qualifier')
  })

  it('달 위상 KO 말 = 엔진 위상 이름(getMoonPhaseName)', () => {
    for (const phase of Object.keys(MOON_PHASE_WORD.en)) {
      expect(MOON_PHASE_WORD.ko[phase]).toBe(getMoonPhaseName(phase as MoonPhase))
    }
    expect(Object.keys(MOON_PHASE_WORD.ko).sort()).toEqual(Object.keys(MOON_PHASE_WORD.en).sort())
  })

  it('참조 없는 교차는 null — 이름·창으로 부모를 추정하지 않는다(엔진 버그는 지어내지 않음)', () => {
    const { crossParents: _drop, ...bare } = CROSS_17
    void _drop
    expect(reasonAstroDetail(bare)).toBeNull()
    // 셀에 그럴듯한 태양 트랜짓이 있어도 읽지 않는다 — 셀을 받는 길 자체가 없다.
    expect(reasonAstroDetail.length).toBe(1)
    expect(Object.keys(astroDetailModule)).not.toContain('findAstroParent')
  })

  it('withReasonDetail — 십신 한자(신살은 없음) + 구조, 입력은 그대로', () => {
    const reason = {
      saju: '상관',
      sajuEn: 'Hurting Officer',
      astro: '태양',
      astroEn: 'Sun',
      meaning: 'm',
      meaningEn: 'm',
      polarity: -2,
    }
    const out = withReasonDetail(reason, CROSS_17)
    expect(out.sajuHanja).toBe('傷官')
    expect(out.astroDetail?.natalPoint).toBe('Moon')
    expect(out.astroDetail?.orb).toBe(0.49)
    expect(reason).not.toHaveProperty('sajuHanja')
    expect(withReasonDetail({ ...reason, saju: '도화' }, CROSS_17).sajuHanja).toBeUndefined()
    const { crossParents: _drop, ...bare } = CROSS_17
    void _drop
    expect(withReasonDetail(reason, bare)).not.toHaveProperty('astroDetail')
  })
})

describe('withTransitPositions — 그날 현지 정오 트랜짓 차트(트랜짓 추출기와 같은 키)', () => {
  // 본명 — 샘플(1997-03-21 14:30 서울)의 태양 0°38′ 양자리 · 달 28°17′ 사자자리.
  const NATAL = natalPointLongitudes({
    chart: {
      planets: [
        { name: 'Sun', longitude: 0.633 },
        { name: 'Moon', longitude: 148.283 },
      ],
      ascendant: { name: 'Ascendant', longitude: 130.03 },
      mc: { name: 'MC', longitude: 40.5 },
    },
    extraPoints: [{ name: 'Chiron', longitude: 190.1 }],
  })
  const loc = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }

  beforeEach(() => {
    chartFor.mockReset()
  })

  it("키 'YYYY-MM-DDT12:00:00' + 출생지 좌표·시간대, 그 행성의 별자리·도", async () => {
    chartFor.mockResolvedValue({
      planets: [
        { name: 'Sun', sign: 'Scorpio', degree: 26, minute: 47, longitude: 236.8 },
        { name: 'Mars', sign: 'Leo', degree: 27, minute: 3, longitude: 147.05 },
      ],
    })
    const [sun, mars] = await withTransitPositions(
      [
        { dateIso: '2026-11-19', detail: { transitPlanet: 'Sun', sourceKind: 'transit' } },
        { dateIso: '2026-11-19', detail: { transitPlanet: 'Mars', sourceKind: 'transit' } },
      ],
      loc,
      NATAL
    )
    expect(chartFor).toHaveBeenCalledWith(
      expect.objectContaining({
        iso: '2026-11-19T12:00:00',
        latitude: 37.5665,
        timeZone: 'Asia/Seoul',
      })
    )
    expect(sun).toMatchObject({ transitSign: 'Scorpio', transitDeg: 26 })
    expect(mars).toMatchObject({ transitSign: 'Leo', transitDeg: 27 })
  })

  it('orb 는 같은 정오 차트에서 다시 잰다 — 구간 최소 orb(정확일 값)를 덮어쓴다(QA-3)', async () => {
    // 11-29 정오 화성 1°14′ 처녀자리 — 본명 달 28°17′ 사자자리와 2.9° 떨어져 있다.
    chartFor.mockResolvedValue({
      planets: [{ name: 'Mars', sign: 'Virgo', degree: 1, minute: 14, longitude: 151.233 }],
    })
    const detail = {
      transitPlanet: 'Mars',
      sourceKind: 'transit',
      aspect: 'conjunction',
      natalPoint: 'Moon',
      orb: 0.1, // 엔진 참조 — 그 구간의 가장 좁은 orb(다른 날)
    }
    const [out] = await withTransitPositions([{ dateIso: '2026-11-29', detail }], loc, NATAL)
    expect(out).toEqual({
      transitPlanet: 'Mars',
      sourceKind: 'transit',
      aspect: 'conjunction',
      natalPoint: 'Moon',
      transitSign: 'Virgo',
      transitDeg: 1,
      orb: 2.95,
    })
    expect(spaced(astroDetailSub(out, 'en'))).toBe(
      'Transit · 1° Virgo · conjunct natal Moon · orb 3.0°'
    )
    expect(detail.orb).toBe(0.1) // 입력은 그대로
  })

  it('어스펙트 각을 뺀다 — 트라인(120°) 태양 1°50′ 사수자리 vs 본명 태양 0°38′ 양자리 = 1.2°', async () => {
    chartFor.mockResolvedValue({
      planets: [{ name: 'Sun', sign: 'Sagittarius', degree: 1, minute: 50, longitude: 241.833 }],
    })
    const [out] = await withTransitPositions(
      [
        {
          dateIso: '2026-11-24',
          detail: {
            transitPlanet: 'Sun',
            sourceKind: 'transit',
            aspect: 'trine',
            natalPoint: 'Sun',
            orb: 0.2,
          },
        },
      ],
      loc,
      NATAL
    )
    expect(out.orb).toBe(1.2)
  })

  it('위치를 못 구하면(차트 실패 · 행성 없음) 위치도 orb 도 없이 — 어긋난 숫자를 남기지 않는다', async () => {
    const detail = {
      transitPlanet: 'Sun',
      sourceKind: 'transit',
      aspect: 'square',
      natalPoint: 'Moon',
      orb: 0.4,
    }
    const { orb: _o, ...bare } = detail
    void _o
    chartFor.mockRejectedValue(new Error('ephe down'))
    const [failed] = await withTransitPositions([{ dateIso: '2026-11-19', detail }], loc, NATAL)
    expect(failed).toEqual(bare)
    chartFor.mockResolvedValue({ planets: [] })
    const [missing] = await withTransitPositions([{ dateIso: '2026-11-19', detail }], loc, NATAL)
    expect(missing).toEqual(bare)
  })

  it('트랜짓 부모가 아니면(어스펙트 없음) 위치만, orb 없음', async () => {
    chartFor.mockResolvedValue({
      planets: [{ name: 'Venus', sign: 'Libra', degree: 3, minute: 0, longitude: 183 }],
    })
    const [out] = await withTransitPositions(
      [{ dateIso: '2026-11-19', detail: { transitPlanet: 'Venus', sourceKind: 'dignity' } }],
      loc,
      NATAL
    )
    expect(out).toEqual({
      transitPlanet: 'Venus',
      sourceKind: 'dignity',
      transitSign: 'Libra',
      transitDeg: 3,
    })
  })

  it('natalPointLongitudes — 트랜짓 추출기와 같은 점 집합(행성 · 추가 점 · ASC · MC)', () => {
    expect([...NATAL.keys()]).toEqual(['Sun', 'Moon', 'Chiron', 'Ascendant', 'MC'])
    expect(orbAtInstant({ aspect: 'opposition', natalPoint: 'Chiron' }, 12.1, NATAL)).toBe(2)
    expect(orbAtInstant({ aspect: 'square', natalPoint: 'Vertex' }, 0, NATAL)).toBeUndefined()
    expect(orbAtInstant({ natalPoint: 'Moon' }, 0, NATAL)).toBeUndefined()
  })
})

describe('표시 — STARS 칸 보조 줄', () => {
  const detail = {
    transitPlanet: 'Sun',
    sourceKind: 'transit',
    aspect: 'square',
    natalPoint: 'Moon',
    transitSign: 'Scorpio',
    transitDeg: 24,
  }
  it('en / ko — 위치·어스펙트·본명 접점, orb 는 있을 때만', () => {
    expect(spaced(astroDetailSub(detail, 'en'))).toBe('Transit · 24° Scorpio · square natal Moon')
    expect(spaced(astroDetailSub({ ...detail, orb: 0.42 }, 'en'))).toBe(
      'Transit · 24° Scorpio · square natal Moon · orb 0.4°'
    )
    // 조각 안은 줄바꿈 없는 공백 — ' · ' 만 줄이 갈리는 자리(QA VC-8).
    expect(astroDetailSub({ ...detail, orb: 0.42 }, 'en')).toBe(
      ['Transit', '24° Scorpio', 'square natal Moon', 'orb 0.4°']
        .map((p) => p.replace(/ /g, '\u00A0'))
        .join(' · ')
    )
    expect(spaced(astroDetailSub(detail, 'ko'))).toBe('트랜짓 · 전갈자리 24° · 본명 달 스퀘어')
    expect(astroDetailSub({ transitPlanet: 'Venus', sourceKind: 'dignity' }, 'en')).toBe('Transit')
  })
  it('어스펙트 없는 부모 — 품위 · 달 위상 말로 두 ☾ 달 교차가 갈린다(QA VC-5)', () => {
    const moon = { transitPlanet: 'Moon', transitSign: 'Taurus', transitDeg: 24 }
    const dig = { ...moon, sourceKind: 'dignity', qualifier: 'exaltation' }
    const ph = { ...moon, sourceKind: 'moon-phase', qualifier: 'waxing_gibbous' }
    expect(spaced(astroDetailSub(dig, 'en'))).toBe('Transit · 24° Taurus · exalted')
    expect(spaced(astroDetailSub(ph, 'en'))).toBe('Transit · 24° Taurus · waxing gibbous')
    expect(spaced(astroDetailSub(dig, 'ko'))).toBe('트랜짓 · 황소자리 24° · 엑잘테이션(고양)')
    expect(spaced(astroDetailSub(ph, 'ko'))).toBe('트랜짓 · 황소자리 24° · 차오르는 달')
    expect(astroDetailSub(dig, 'en')).not.toBe(astroDetailSub(ph, 'en'))
  })
  it('planetGlyph — 기호가 있는 천체만', () => {
    expect(planetGlyph('Sun')).toBe('sun')
    expect(planetGlyph('Ascendant')).toBe('asc')
    expect(planetGlyph('True Node')).toBeUndefined()
  })
})

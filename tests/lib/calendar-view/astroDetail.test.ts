/**
 * astroDetail — '왜' 근거의 점성 부모 구조. 교차가 싣고 온 엔진의 부모 참조(crossParents)를
 * 그대로 옮긴다 — 월 셀(evidence 비움)·오늘 셀 모두 같은 값, 이름·창으로 추정하는 길은 없다.
 * 실제 천체력 값(11-17 Sun □ Moon, 11-19 트랜짓 태양 전갈자리)과 표본 30일 전부의 참조는
 * calendarSample.real.node.test.ts 가 본다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActiveSignal } from '@/lib/calendar-engine/types'

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
  astroDetailSub,
  planetGlyph,
} = astroDetailModule

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
    ).toEqual({ transitPlanet: 'Mars', sourceKind: 'dignity' })
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
    const loc = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }
    const [sun, mars] = await withTransitPositions(
      [
        { dateIso: '2026-11-19', detail: { transitPlanet: 'Sun', sourceKind: 'transit' } },
        { dateIso: '2026-11-19', detail: { transitPlanet: 'Mars', sourceKind: 'transit' } },
      ],
      loc
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

  it('차트 실패는 위치 없이 둔다(fail-soft)', async () => {
    chartFor.mockRejectedValue(new Error('ephe down'))
    const detail = { transitPlanet: 'Sun', sourceKind: 'transit' }
    const [out] = await withTransitPositions([{ dateIso: '2026-11-19', detail }], {
      latitude: 0,
      longitude: 0,
      timeZone: 'UTC',
    })
    expect(out).toEqual(detail)
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
    expect(astroDetailSub(detail, 'en')).toBe('Transit · 24° Scorpio · square natal Moon')
    expect(astroDetailSub({ ...detail, orb: 0.42 }, 'en')).toBe(
      'Transit · 24° Scorpio · square natal Moon · orb 0.4°'
    )
    expect(astroDetailSub(detail, 'ko')).toBe('트랜짓 · 전갈자리 24° · 본명 달 스퀘어')
    expect(astroDetailSub({ transitPlanet: 'Venus', sourceKind: 'dignity' }, 'en')).toBe('Transit')
  })
  it('planetGlyph — 기호가 있는 천체만', () => {
    expect(planetGlyph('Sun')).toBe('sun')
    expect(planetGlyph('Ascendant')).toBe('asc')
    expect(planetGlyph('True Node')).toBeUndefined()
  })
})

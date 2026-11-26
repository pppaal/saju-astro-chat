/**
 * astroDetail — '왜' 근거의 점성 부모 구조. 월 셀(evidence 비움)은 살아남은 부모 이름·id 로,
 * 오늘 셀(evidence)은 parentIds 로 부모를 찾는다. 실제 천체력 값(11-17 Sun □ Moon, 11-19 트랜짓
 * 태양 전갈자리)은 calendarSample.real.node.test.ts 가 본다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActiveSignal } from '@/lib/calendar-engine/types'

const chartFor = vi.fn()
vi.mock('@/lib/calendar-engine/ephe-cache', () => ({
  getCachedTransitChart: (args: { iso: string }) => chartFor(args),
}))

const {
  parseTransitName,
  astroPlanetOf,
  findAstroParent,
  reasonAstroDetail,
  withReasonDetail,
  withTransitPositions,
  astroDetailSub,
  planetGlyph,
} = await import('@/lib/calendar-view/astroDetail')

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

/** 2026-11-17 월 셀 모양(stripEvidence) — 상관 × 태양 daily 교차와 태양 후보들. */
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

describe('findAstroParent / reasonAstroDetail — 월 셀(evidence 없음)', () => {
  it('11-17 상관 × 태양 ▼ → 부모 Sun □ Moon (부호 반대 · 행성시 · 다른 행성은 후보 아님)', () => {
    expect(findAstroParent(CELL_17, CROSS_17)?.name).toBe('Sun □ Moon')
    expect(reasonAstroDetail(CELL_17, CROSS_17)).toEqual({
      transitPlanet: 'Sun',
      sourceKind: 'transit',
      aspect: 'square',
      natalPoint: 'Moon',
    })
  })

  it('부호 0 부모도 허용(combinePolarity — 한쪽 0 이면 매핑 부호)', () => {
    const cross = sig({
      id: 'cross.편재-x-Mars.daily:2026-11-08~2026-11-08',
      name: '편재 × 화성',
      source: 'saju',
      kind: 'cross-activation',
      polarity: -1,
      evidence: { module: 'cross-activation', detail: {} },
    })
    const cell = {
      signals: [
        sig({
          id: 'astro.dignity.Mars|face|Leo.2026-11-04',
          name: 'Mars 페이스 (Face/Decan) in Leo',
          polarity: 1,
          layer: 'monthly',
          evidence: { module: 'astro-dignity', detail: {} },
        }),
        sig({
          id: 'astro.house-transit.Mars.1.2026-10-16',
          name: 'Mars in 1H',
          kind: 'house-transit',
          layer: 'monthly',
          polarity: 0,
          active: {
            start: '2026-10-16T00:00:00.000Z',
            peak: '2026-11-01T00:00:00.000Z',
            end: '2026-11-30T23:59:59.999Z',
          },
        }),
        cross,
      ],
    }
    expect(reasonAstroDetail(cell, cross)).toEqual({
      transitPlanet: 'Mars',
      sourceKind: 'house-transit',
    })
  })

  it('창이 교차 창을 덮지 않거나 층이 교차보다 좁은 후보는 부모가 아니다', () => {
    const cross = { ...CROSS_17, id: 'cross.상관-x-Sun.daily:2026-11-12~2026-11-12' }
    expect(findAstroParent(CELL_17, cross)).toBeNull()
    expect(reasonAstroDetail(CELL_17, cross)).toEqual({
      transitPlanet: 'Sun',
      sourceKind: 'unknown',
    })
  })
})

describe('reasonAstroDetail — 오늘 셀(evidence 포함): parentIds 로 정확히, orb 까지', () => {
  it('evidence 셀의 같은 교차 id → parentIds[1] 부모의 orb', () => {
    const parent = sig({
      id: 'astro.transit.Sun|Moon|square.2026-11-16',
      name: 'Sun □ Moon',
      polarity: -1,
      evidence: {
        module: 'astro-transit',
        planets: ['Sun', 'Moon'],
        aspectType: 'square',
        orbDegrees: 0.4866,
        detail: {},
      },
    })
    const evCross = {
      ...CROSS_17,
      evidence: {
        module: 'cross-activation',
        detail: { parentIds: ['saju.x', parent.id], astroKey: 'Sun' },
      },
    }
    const detail = reasonAstroDetail(CELL_17, CROSS_17, { signals: [parent, evCross] })
    expect(detail).toEqual({
      transitPlanet: 'Sun',
      sourceKind: 'transit',
      aspect: 'square',
      natalPoint: 'Moon',
      orb: 0.49,
    })
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
    const out = withReasonDetail(reason, CELL_17, CROSS_17)
    expect(out.sajuHanja).toBe('傷官')
    expect(out.astroDetail?.natalPoint).toBe('Moon')
    expect(reason).not.toHaveProperty('sajuHanja')
    expect(
      withReasonDetail({ ...reason, saju: '도화' }, CELL_17, CROSS_17).sajuHanja
    ).toBeUndefined()
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

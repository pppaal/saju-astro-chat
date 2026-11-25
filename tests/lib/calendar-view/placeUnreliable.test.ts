/**
 * 캘린더 뷰 — 출생시각/출생지 미상(natal.astro.placeUnreliable)이면 상승궁·MC·하우스 기반
 * 문구를 내지 않는다 (엔진 감사 F1, CONVENTIONS §5).
 *
 * E7 이 buildNatalContext 에서 placeUnreliable 을 채우고 lot·ZR·Almuten 을 비웠지만, 뷰 층은
 * chart.ascendant / chart.mc 를 직접 읽었다 — 정오 앵커·기본 좌표 폴백 각이 화면에 나갔다:
 *  - toUser.deriveAstro (프로필 카드의 상승궁·MC)
 *  - deriveLifetimeFlow intro 의 astroId ('… rising', 'MC in …')
 *  - buildHourCrossings (시진별 그 시각 상승궁 + 룰러 교차)
 */
import { describe, it, expect } from 'vitest'
import { toUser } from '@/lib/calendar-view/toUser'
import { buildHourCrossings } from '@/lib/calendar-view/toHourCrossings'
import { deriveLifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import { makeNatal, makeChart, makePlanet, makeCell, makeSignal } from './_fixtures'

function unreliable(natal: NatalContext): NatalContext {
  return { ...natal, astro: { ...natal.astro, placeUnreliable: true } }
}

const CHART = makeChart({
  planets: [makePlanet('Sun', 'Aquarius')],
  ascSign: 'Cancer',
  mcSign: 'Aries',
})

describe('toUser.deriveAstro — placeUnreliable', () => {
  it('미상이면 상승궁·MC 를 비우고 태양 별자리만 남긴다', () => {
    const u = toUser(unreliable(makeNatal({ chart: CHART })))
    expect(u.astro.sunEn).toBe('Aquarius')
    expect(u.astro.sun).toBe('물병자리')
    expect(u.astro.asc).toBeUndefined()
    expect(u.astro.ascEn).toBeUndefined()
    expect(u.astro.mc).toBeUndefined()
    expect(u.astro.mcEn).toBeUndefined()
  })

  it('신뢰 가능하면 그대로(대조군)', () => {
    const u = toUser(makeNatal({ chart: CHART }))
    expect(u.astro.ascEn).toBe('Cancer')
    expect(u.astro.mcEn).toBe('Aries')
  })

  it('시간 미상이면 birth/birthKo 에 정오 앵커 시각을 싣지 않는다', () => {
    const natal = makeNatal({ input: { year: 1995, month: 2, date: 9, hour: 12, minute: 0 } })
    natal.saju.timeUnknown = true
    const u = toUser(unreliable(natal))
    expect(u.birth).toBe('1995-02-09')
    expect(u.birthKo).toBe('1995년 2월 9일')
  })
})

// deriveLifetimeFlow 최소 본명 — tests/lib/calendar-engine/lifetimeFlow.test.ts 의 fixture 와 같은 꼴.
function lifeNatal(placeUnreliable: boolean): NatalContext {
  return {
    input: { year: 1990, month: 5, date: 15, timeZone: 'Asia/Seoul' },
    saju: {
      pillars: {
        year: { heavenlyStem: { name: '庚' }, earthlyBranch: { name: '午' } },
        month: { earthlyBranch: { name: '巳' } },
        day: { heavenlyStem: { name: '辛' }, earthlyBranch: { name: '酉' } },
      },
      dayMaster: { name: '辛' },
      strength: 'medium',
      yongsin: { primary: '토', avoid: [] },
      daeun: [
        { startAge: 5, startYear: 1995, stem: '丁', branch: '丑' },
        { startAge: 15, startYear: 2005, stem: '丙', branch: '子' },
        { startAge: 25, startYear: 2015, stem: '乙', branch: '亥' },
        { startAge: 35, startYear: 2025, stem: '甲', branch: '戌' },
      ],
      natalShinsal: [],
      analyses: {},
      timeUnknown: true,
    },
    astro: {
      chart: {
        planets: [{ name: 'Sun', sign: 'Leo' }],
        ascendant: { sign: 'Scorpio' },
        mc: { sign: 'Aquarius' },
      },
      ...(placeUnreliable ? { placeUnreliable: true } : {}),
    },
  } as unknown as NatalContext
}

describe('deriveLifetimeFlow intro astroId — placeUnreliable', () => {
  const NOW = new Date('2026-11-25T00:00:00Z')

  it('KO: 미상이면 태양만 — 상승·MC 없음', () => {
    const intro = deriveLifetimeFlow(lifeNatal(true), 'ko', undefined, NOW)!.intro
    expect(intro).toContain('태양')
    expect(intro).not.toContain('상승')
    expect(intro).not.toContain('MC')
  })

  it('EN: 미상이면 Sun 만 — rising·MC 없음', () => {
    const intro = deriveLifetimeFlow(lifeNatal(true), 'en', undefined, NOW)!.intro
    expect(intro).toContain('Sun in')
    expect(intro).not.toContain('rising')
    expect(intro).not.toContain('MC in')
  })

  it('신뢰 가능하면 상승·MC 포함(대조군)', () => {
    const ko = deriveLifetimeFlow(lifeNatal(false), 'ko', undefined, NOW)!.intro
    expect(ko).toContain('상승')
    expect(ko).toContain('MC')
    const en = deriveLifetimeFlow(lifeNatal(false), 'en', undefined, NOW)!.intro
    expect(en).toContain('rising')
  })
})

describe('buildHourCrossings — placeUnreliable', () => {
  // 그날 시진 신호 3개(정재 = 금성 룰러면 사전 매핑이 있는 십신).
  const cell = makeCell({
    datetime: '2026-06-15T00:00:00.000Z',
    signals: [5, 11, 17].map((h) =>
      makeSignal({
        kind: 'pillar-sibsin',
        layer: 'hourly',
        polarity: 1,
        korean: `시진 ${h}`,
        evidence: {
          module: 'saju-hour',
          sibsin: '정재',
          detail: { startHour: h, windowLabel: `${h}-${h + 2}시` },
        } as never,
      })
    ),
  })
  const loc = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }

  it('미상이면 상승궁·룰러를 구하지 않고 교차(matched)·사전 해석도 없다 — 사주 시진 한 줄은 유지', () => {
    const rows = buildHourCrossings(cell, '2026-06-15', loc, { placeUnreliable: true })
    expect(rows).toHaveLength(3)
    for (const r of rows) {
      expect(r.risingSignKo).toBe('')
      expect(r.risingSignEn).toBe('')
      expect(r.ruler).toBe('')
      expect(r.rulerEn).toBe('')
      expect(r.matched).toBe(false)
      expect(r.crossMeaning).toBeUndefined()
      expect(r.crossMeaningEn).toBeUndefined()
      expect(r.narrative).toMatch(/^시진 /)
    }
  })

  it('신뢰 가능하면 시진마다 상승궁·룰러를 단다(대조군)', () => {
    const rows = buildHourCrossings(cell, '2026-06-15', loc)
    expect(rows).toHaveLength(3)
    for (const r of rows) {
      expect(r.risingSignEn).not.toBe('')
      expect(r.rulerEn).not.toBe('')
    }
  })
})

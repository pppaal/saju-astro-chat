/**
 * Day 시진 리듬 줄 — 표시 창 = 엔진 창 (재감사 TP-8), 시진 × 상승궁은 교차 아님 (owner 결정 19,
 * 재감사 CC-3).
 *
 *  - 줄의 시각은 엔진 시진 신호의 실제 창(평균태양시) 그대로 — 마드리드 여름 卯 07:15–09:15,
 *    서울 子 23:32–01:32. '5-7am' 같은 명목 라벨 금지.
 *  - 상승궁은 그 실제 창의 한가운데 순간(detail.centerUtc)에서 구한다.
 *  - 줄에는 matched·교차 해석·상승궁 룰러가 없다 — 2시간 시진 × 토성·목성 같은 밴드 밖 짝이
 *    교차로 보일 길이 없다.
 *
 * 상승궁 *값*의 천문 정확도는 hourRhythm.real.node.test.ts(실제 천체력)에서 본다. 여기서는
 * calcHouses 에 넘어가는 순간(JD)만 잡아 배선을 고정한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const housesJd: number[] = []
vi.mock('@/lib/astrology/foundation/houses', () => ({
  calcHouses: (jd: number) => {
    housesJd.push(jd)
    return { ascendant: 125, mc: 35, house: [] } // 사자 5°
  },
}))

import sajuHourExtractor from '@/lib/calendar-engine/extractors/saju-hour'
import { buildHourCrossings } from '@/lib/calendar-view/toHourCrossings'
import type { ActiveSignal, CalendarCell } from '@/lib/calendar-engine/types'

/** 기신이 오행 전부라 모든 시진 조각이 신호로 나오는 가짜 본명. */
function cellFor(dayIso: string, longitude: number, timeZone: string): CalendarCell {
  const natal = {
    saju: {
      pillars: { day: { heavenlyStem: { name: '甲' } } },
      yongsin: { primary: 'none', avoid: ['목', '화', '토', '금', '수'] },
    },
    astro: { location: { latitude: 40, longitude, timeZone } },
  }
  const signals = sajuHourExtractor.extract({
    natal,
    range: { start: `${dayIso}T00:00:00.000Z`, end: `${dayIso}T00:00:00.000Z`, granularity: 'day' },
    cache: { get: () => undefined, set: () => {} },
  } as never) as ActiveSignal[]
  return {
    datetime: `${dayIso}T00:00:00.000Z`,
    signals,
    derivedScore: 50,
    salience: 0,
    matchedPatterns: [],
    topReasons: [],
    cautions: [],
  }
}

const MADRID = { latitude: 40.4168, longitude: -3.7038, timeZone: 'Europe/Madrid' }
const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }
const jdOf = (iso: string) => Date.parse(iso) / 86_400_000 + 2440587.5

beforeEach(() => {
  housesJd.length = 0
})

describe('buildHourCrossings — 표시 창 = 엔진 창 (TP-8)', () => {
  it('마드리드 2026-07-15(CEST): 卯 줄은 07:15–09:15, 亥 줄은 23:15–01:15 — 명목 라벨 없음', () => {
    const cell = cellFor('2026-07-15', MADRID.longitude, MADRID.timeZone)
    const rows = buildHourCrossings(cell, '2026-07-15', MADRID)
    const rabbit = rows.find((r) => r.whenEn.includes('Rabbit hour'))!
    expect(rabbit.when).toBe('07:15–09:15 (묘시)')
    expect(rabbit.whenEn).toBe('07:15–09:15 (Rabbit hour)')
    expect([rabbit.clockStart, rabbit.clockEnd]).toEqual(['07:15', '09:15'])
    // 자정을 감싸는 亥 — 00:00–01:15 조각이지만 줄은 그 시진 한 번 전체.
    expect(rows[0].whenEn).toBe('23:15–01:15 (Pig hour)')
    for (const r of rows) {
      expect(r.whenEn).not.toMatch(/\d(am|pm)/)
      expect(r.when).not.toMatch(/\d+-\d+시/)
    }
  })

  it('줄의 창 = 그 時柱 엔진 신호의 창, 줄 순서 = 실제 시각순(그날 첫 조각)', () => {
    for (const [loc, day] of [
      [MADRID, '2026-07-15'],
      [SEOUL, '2026-11-25'],
      [{ latitude: 40.71, longitude: -74.006, timeZone: 'America/New_York' }, '2026-03-08'],
    ] as const) {
      const cell = cellFor(day, loc.longitude, loc.timeZone)
      const rows = buildHourCrossings(cell, day, loc)
      const firstPieceStart: number[] = []
      for (const r of rows) {
        const sigs = cell.signals.filter(
          (s) =>
            `${s.evidence.detail?.clockStart}–${s.evidence.detail?.clockEnd}` ===
            r.when.slice(0, 11)
        )
        expect(sigs.length, `${day} ${r.when}`).toBeGreaterThan(0)
        // 한 조각짜리 시진은 신호 active 창과 글자 그대로 같다.
        if (sigs.length === 1 && !sigs[0].evidence.detail?.segment) {
          expect(r.when.slice(0, 11)).toBe(
            `${sigs[0].active.start.slice(11, 16)}–${sigs[0].active.end.slice(11, 16)}`
          )
        }
        firstPieceStart.push(Math.min(...sigs.map((s) => Date.parse(s.active.start))))
      }
      expect(firstPieceStart).toEqual([...firstPieceStart].sort((a, b) => a - b))
    }
    // 서울 子 는 맨 앞 줄, 실제 창 23:32–01:32.
    const seoul = buildHourCrossings(
      cellFor('2026-11-25', SEOUL.longitude, SEOUL.timeZone),
      '2026-11-25',
      SEOUL
    )
    expect(seoul[0].when).toBe('23:32–01:32 (자시)')
  })

  it('상승궁은 실제 창 한가운데 순간에서 — 마드리드 卯 = 08:15 CEST(06:15Z), 명목 06:00 아님', () => {
    const cell = cellFor('2026-07-15', MADRID.longitude, MADRID.timeZone)
    const rows = buildHourCrossings(cell, '2026-07-15', MADRID)
    const i = rows.findIndex((r) => r.whenEn.includes('Rabbit hour'))
    expect(housesJd).toHaveLength(rows.length)
    expect(housesJd[i]).toBeCloseTo(jdOf('2026-07-15T06:15:00Z'), 6)
    // 亥(23:15–01:15) 한가운데 = 그날 00:15 CEST.
    expect(housesJd[0]).toBeCloseTo(jdOf('2026-07-14T22:15:00Z'), 6)
    expect(rows[i].risingSignEn).toBe('Leo')
    expect(rows[i].risingSignKo).toBe('사자자리')
  })

  it('봄 전환일 — 뉴욕 2026-03-08 丑 00:56–03:56 의 한가운데는 01:56 EST(06:56Z)', () => {
    const ny = { latitude: 40.71, longitude: -74.006, timeZone: 'America/New_York' }
    const rows = buildHourCrossings(
      cellFor('2026-03-08', ny.longitude, ny.timeZone),
      '2026-03-08',
      ny
    )
    const i = rows.findIndex((r) => r.whenEn.includes('Ox hour'))
    expect(rows[i].when).toBe('00:56–03:56 (축시)')
    expect(housesJd[i]).toBeCloseTo(jdOf('2026-03-08T06:56:00Z'), 6)
  })
})

describe('buildHourCrossings — 시진 × 상승궁은 교차가 아니다 (owner 결정 19, CC-3)', () => {
  it('줄에 matched·교차 해석·상승궁 룰러가 없다', () => {
    for (const [loc, day] of [
      [MADRID, '2026-07-15'],
      [SEOUL, '2026-10-12'],
    ] as const) {
      const rows = buildHourCrossings(cellFor(day, loc.longitude, loc.timeZone), day, loc)
      expect(rows.length).toBeGreaterThan(0)
      for (const r of rows) {
        expect(Object.keys(r).sort()).toEqual(
          [
            'clockEnd',
            'clockStart',
            'narrative',
            'narrativeEn',
            'risingSignEn',
            'risingSignKo',
            'sibsin',
            'strength',
            'tone',
            'when',
            'whenEn',
          ].sort()
        )
        for (const text of [r.narrative, r.narrativeEn])
          expect(text ?? '').not.toMatch(/×|Saturn|Jupiter|토성|목성/)
      }
    }
  })
})

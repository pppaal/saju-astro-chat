/**
 * @file mock.ts
 * Mock data for destinypal hooks — lets the UI render without a live
 * backend. Shape mirrors what the *raw* API would emit (NOT the
 * destinypal data.js shape — that's the adapter's job).
 *
 * Toggle:
 *   - env: NEXT_PUBLIC_DESTINYPAL_MOCK=1
 *   - per-call: pass `mock: true` to any hook
 *
 * Fixture data sourced from destinypal-extracted/js/data.js (1995-02-09
 * 06:40 Seoul male) so adapters can be regression-tested against the
 * same expected output.
 */

import type {
  RawAstrologyResponse,
  RawCalendarResponse,
  RawConvergenceResponse,
  RawDateDetailResponse,
  RawDecadePayload,
  RawLifetimePayload,
  RawMonthPayload,
  RawNatalContextResponse,
  RawSajuResponse,
  RawYearPayload,
} from './types'

const MOCK_SAJU: RawSajuResponse = {
  success: true,
  ilgan: { hanja: '辛', kr: '신금', element: 'metal', polarity: 'yin' },
  pillars: {
    year: { stem: '乙', branch: '亥', jijanggan: ['壬', '甲'] },
    month: { stem: '戊', branch: '寅', jijanggan: ['甲', '丙', '戊'] },
    day: { stem: '辛', branch: '丑', jijanggan: ['己', '癸', '辛'] },
    time: { stem: '辛', branch: '卯', jijanggan: ['乙'] },
  },
  gyeokguk: {
    name: '정인격',
    nameEn: 'Direct Resource',
    success: 'mixed',
    successPercent: 50,
    failurePercent: 50,
    notes: '반성반파 — 정인의 지원이 식상에 의해 부분 손상',
  },
  yongsin: { primary: '火', secondary: '土' },
  daeun: {
    startAge: 7,
    direction: 'forward',
    current: { gz: '乙亥', start: 2016, end: 2026, sibsin: '편재' },
    list: [
      { gz: '丙子', start: 2006, end: 2016, sibsin: '정관' },
      { gz: '乙亥', start: 2016, end: 2026, sibsin: '편재' },
      { gz: '甲戌', start: 2026, end: 2036, sibsin: '편재' },
    ],
  },
  shinsal: { active: ['역마', '도화'] },
  jijanggan: {
    day: {
      primary: '辛', // 정기
      middle: '癸', // 중기
      residual: '己', // 여기
    },
  },
}

const MOCK_ASTRO: RawAstrologyResponse = {
  success: true,
  natal: {
    sun: { sign: 'Aquarius', degree: 20.5, house: 1 },
    moon: { sign: 'Libra', degree: 4.2, house: 9 },
    mercury: { sign: 'Aquarius', degree: 15.0, house: 1 },
    ascendant: { sign: 'Aquarius', degree: 12.0 },
    mc: { sign: 'Scorpio', degree: 18.0 },
  },
  dignities: {
    sun: { score: -5, status: 'detriment' },
    saturn: { score: 5, status: 'rulership' },
  },
  sect: 'diurnal',
  almuten: { planet: 'Saturn', score: 18 },
  lots: {
    fortune: { sign: 'Sagittarius', degree: 8.1 },
    spirit: { sign: 'Gemini', degree: 15.9 },
    eros: { sign: 'Capricorn', degree: 2.0 },
    necessity: { sign: 'Aquarius', degree: 25.0 },
    courage: { sign: 'Leo', degree: 11.0 },
    victory: { sign: 'Virgo', degree: 7.5 },
    nemesis: { sign: 'Cancer', degree: 19.3 },
  },
  zr: {
    fortune: {
      l1: { sign: 'Sagittarius', ruler: 'Jupiter', start: '2020-04', end: '2032-04' },
      l2: { sign: 'Capricorn', ruler: 'Saturn', start: '2024-01', end: '2026-08' },
    },
    spirit: {
      l1: { sign: 'Gemini', ruler: 'Mercury', start: '2018-10', end: '2038-10' },
      l2: { sign: 'Leo', ruler: 'Sun', start: '2025-02', end: '2027-09' },
    },
  },
}

const MOCK_CALENDAR: RawCalendarResponse = {
  success: true,
  year: 2026,
  allDates: [],
  matrixContract: { overallPhaseLabel: '확장기' },
  monthly: [],
  daeun: { current: { gz: '甲戌', start: 2026, end: 2036, sibsin: '편재' } },
}

const MOCK_CONVERGENCE: RawConvergenceResponse = {
  success: true,
  convergence: { topDates: [] },
  monthly: [],
}

const MOCK_DATE_DETAIL: RawDateDetailResponse = {
  success: true,
  data: {
    date: '2026-06-15',
    grade: 3,
    score: 72,
    ganzhi: '庚申',
    transitSunSign: 'Gemini',
  },
}

export function mockNatal(): RawNatalContextResponse {
  return { saju: MOCK_SAJU, astrology: MOCK_ASTRO }
}

export function mockLifetime(): RawLifetimePayload {
  return mockNatal()
}

export function mockDecade(_year: number): RawDecadePayload {
  return { calendar: MOCK_CALENDAR, daeunIndex: 2 }
}

export function mockYear(_year: number): RawYearPayload {
  return { calendar: MOCK_CALENDAR, convergence: MOCK_CONVERGENCE }
}

export function mockMonth(_year: number, month: number): RawMonthPayload {
  return { calendar: MOCK_CALENDAR, month }
}

export function mockDay(_date: string): RawDateDetailResponse {
  return MOCK_DATE_DETAIL
}

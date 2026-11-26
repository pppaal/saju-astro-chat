/**
 * keyDays — v9 큰 날 행. 판정 단어는 그리드 마크(FIX9b E5 · 오너 결정 DOCTRINE #1), 뜻은 같은
 * 엔진 톤 풀(toneMeaningFor)을 마크 톤으로. MonthTier 의 톤 권위 가드(감사 #2·#3·#11)와
 * 최고의 날 덧붙임을 *마크 라벨* 규칙으로 다시 못 박는다.
 */
import { describe, it, expect } from 'vitest'
import {
  buildKeyDayItems,
  verdictPrefix,
  keyDayMeaning,
  markTone,
  dayKindOf,
} from '@/lib/calendar-view/keyDays'
import { toneMeaningFor } from '@/lib/calendar-engine/derivers/toneMeaning'
import type { DestinyMonth, DestinyDayMark } from '@/types/calendar'
import { makeV9Month, SAMPLE_SEED } from './_v9Month'

const HANGUL = /[ㄱ-ㆎ가-힣]/

/** marks 만 다른 30일 달(오늘 표지 없음 — focusDay 로 지난 날을 센다). */
function monthWithMarks(
  marks: Record<number, DestinyDayMark | null>,
  overrides: Partial<DestinyMonth> = {}
): DestinyMonth {
  const ds = (d: number) => `11-${String(d).padStart(2, '0')}`
  const days = Object.keys(marks).map(Number)
  const best = days.find((d) => marks[d] === 'best')
  return {
    label: '',
    ym: '2026-11',
    woolun: { hanja: '己亥', kr: '기해', en: 'gihae' },
    cautionDays: [],
    goodDays: [],
    avoidDays: [],
    bestDay: { date: best ? ds(best) : '', score: best ? 79 : 0 },
    keyDays: days
      .filter((d) => marks[d] !== 'best')
      .map((d) => ({ date: ds(d), astro: [], saju: [], bothSystems: true })),
    focusDay: 19,
    calendar: Array.from({ length: 30 }, (_, i) => ({
      d: i + 1,
      ds: ds(i + 1),
      intensity: 0.5,
      mark: marks[i + 1] ?? null,
      focus: i + 1 === 19,
    })),
    seed: SAMPLE_SEED,
    ...overrides,
  }
}

describe('keyDays — 판정 단어 = 그리드 마크 (FIX9b E5)', () => {
  it('샘플 마크 {5 무색, 9 good, 14 caution, 17 avoid, 24 best, 29 avoid} · 시드 3804016609 · en', () => {
    const month = monthWithMarks({
      5: null,
      9: 'good',
      14: 'caution',
      17: 'avoid',
      24: 'best',
      29: 'avoid',
    })
    const lines = buildKeyDayItems(month, 'en').map((k) => `${k.verdict} · ${k.meaning}`)
    expect(lines).toEqual([
      'Calm day · The season turns.',
      'Good day · Go for it — no regrets today.',
      "Caution · Don't ignore your body's signal.",
      // B2 문구(예전 'Put yourself first today').
      'Avoid · Look after yourself first today.',
      'Best day · Energy runs over the brim.',
      'Avoid · Hands off the decide button.',
    ])
  })

  it('기준일 19(focusDay)보다 앞선 행만 past, 행은 구조(문자열 이어 붙이기 없음)', () => {
    const month = monthWithMarks({
      5: null,
      9: 'good',
      14: 'caution',
      17: 'avoid',
      24: 'best',
      29: 'avoid',
    })
    const items = buildKeyDayItems(month, 'en')
    expect(items.map((k) => [k.d, k.past])).toEqual([
      [5, true],
      [9, true],
      [14, true],
      [17, true],
      [24, false],
      [29, false],
    ])
    const k5 = items[0]
    expect(k5).toMatchObject({ ds: '11-05', d: 5, weekday: 'Thu', mark: 'calm', best: false })
    expect(items.find((k) => k.d === 24)).toMatchObject({
      mark: 'best',
      best: true,
      bothSystems: false,
    })
  })

  it('서버 표지(cell.past · month.todayDay)가 있으면 그것을 따른다', () => {
    const items = buildKeyDayItems(makeV9Month(), 'en')
    expect(items.map((k) => k.ds)).toEqual(['11-05', '11-09', '11-14', '11-17', '11-24', '11-29'])
    expect(items.filter((k) => k.past).map((k) => k.d)).toEqual([5, 9, 14, 17])
    // 17일은 펼칠 교차 근거를 싣는다(그날의 ▼ 한 행).
    expect(items.find((k) => k.d === 17)!.reason?.astroDetail).toMatchObject({
      transitPlanet: 'Sun',
      aspect: 'square',
      natalPoint: 'Moon',
    })
  })

  it('ko 판정 단어', () => {
    expect(verdictPrefix('best', 'ko')).toBe('최고의 날')
    expect(verdictPrefix('good', 'ko')).toBe('좋은 날')
    expect(verdictPrefix('caution', 'ko')).toBe('조심할 날')
    expect(verdictPrefix('avoid', 'ko')).toBe('피할 날')
    expect(verdictPrefix(null, 'ko')).toBe('잔잔한 날')
    expect(verdictPrefix('focus', 'en')).toBe('Calm day')
  })

  it('마크 → 톤: best/good 좋음, caution/avoid 주의, 그 밖 중립', () => {
    expect(markTone('best')).toBe('positive')
    expect(markTone('good')).toBe('positive')
    expect(markTone('caution')).toBe('negative')
    expect(markTone('avoid')).toBe('negative')
    expect(markTone('focus')).toBe('neutral')
    expect(markTone(null)).toBe('neutral')
    expect(dayKindOf('focus')).toBe('calm')
  })
})

describe('keyDays — MonthTier 톤 권위 가드를 마크 라벨로 재지정 (감사 #2·#3·#11)', () => {
  it('#3 — 수렴 톤이 positive 여도 그리드가 avoid 면 Avoid + 주의 풀 문구', () => {
    const month = monthWithMarks({ 5: 'avoid' })
    month.keyDays = [
      {
        date: '11-05',
        meaning: 'move first and you win',
        tone: 'positive',
        astro: [],
        saju: [],
        bothSystems: false,
      },
    ]
    month.calendar[4].tone = 'caution'
    const [k] = buildKeyDayItems(month, 'en')
    expect(k.verdict).toBe('Avoid')
    expect(k.meaning).not.toMatch(/move first and you win/i)
    expect(k.meaning.toLowerCase().replace(/\.$/, '')).toBe(
      toneMeaningFor('negative', 5, 'en', SAMPLE_SEED)
    )
  })

  it('#2 — 화해 톤(mixed)은 라벨을 바꾸지 않는다: 그리드 good 이면 Good day(색 = 단어)', () => {
    const month = monthWithMarks({ 5: 'good' })
    month.calendar[4].tone = 'mixed'
    const [k] = buildKeyDayItems(month, 'en')
    expect(k.verdict).toBe('Good day')
    expect(k.meaning).toBe(keyDayMeaning('good', 5, 'en', SAMPLE_SEED))
  })

  it('#11 — 뜻은 요청 로케일로 다시 뽑는다: 서버(ko) meaning 이 EN 행에 새지 않는다', () => {
    const month = monthWithMarks({ 5: 'good', 24: 'best' })
    month.keyDays = [
      {
        date: '11-05',
        meaning: '먼저 움직이면 이기는 날',
        tone: 'positive',
        astro: [],
        saju: [],
        bothSystems: true,
      },
    ]
    for (const k of buildKeyDayItems(month, 'en')) {
      expect(HANGUL.test(`${k.verdict} ${k.meaning} ${k.weekday}`)).toBe(false)
    }
  })

  it('최고의 날이 수렴 큰 날에 없으면 덧붙인다(날짜순, Best day)', () => {
    const month = monthWithMarks({ 20: 'caution', 24: 'best' })
    month.keyDays = [{ date: '11-20', astro: [], saju: ['편관'], bothSystems: false }]
    const items = buildKeyDayItems(month, 'ko')
    expect(items.map((k) => [k.ds, k.verdict])).toEqual([
      ['11-20', '조심할 날'],
      ['11-24', '최고의 날'],
    ])
  })

  it('최고의 날이 없는 달은 덧붙이지 않는다', () => {
    const month = monthWithMarks({ 9: 'good' })
    expect(buildKeyDayItems(month, 'en').map((k) => k.ds)).toEqual(['11-09'])
  })
})

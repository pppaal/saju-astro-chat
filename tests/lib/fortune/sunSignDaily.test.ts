/**
 * Daily sun-sign horoscope engine (sunSignDaily) — verification.
 *
 * The global test setup mocks swisseph with fixed, fake positions (the Sun is
 * always in the same place), which would make every date identical and defeat
 * the variety assertions below. Like real-ephemeris-correctness.test.ts, this
 * file unmocks swisseph + ephe and runs in the node environment against the
 * real ephemeris files in public/ephe. When the native binary cannot load
 * (CI runner without a rebuilt swisseph), the ephemeris-backed suites skip
 * and only the pure-function suite runs.
 *
 * @vitest-environment node
 */

import { describe, expect, it, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

import { getSunSignBySlug, SUN_SIGNS } from '@/lib/astrology/sunSigns'
import {
  HEADLINES,
  LOVE_TONE_COPY,
  PHASE_COPY,
  PHASE_MONEY_COPY,
  SHARED_BANK_SIZE,
  SIGN_PROFILES,
} from '@/lib/fortune/sunSignCopy'
import {
  aspectBetween,
  computeAllSunSignDaily,
  computeSunSignDaily,
  computeSunSignTomorrow,
  computeSunSignWeek,
  elementHarmony,
  moonRelationForDistance,
  pickVariant,
  signDistance,
  utcDateString,
  utcDayIndex,
} from '@/lib/fortune/sunSignDaily'

const swissephAvailable = await import('swisseph').then(() => true).catch(() => false)
const describeWithEphemeris = swissephAvailable ? describe : describe.skip

// Fixed anchor: 2026-11-16, mid-morning UTC so no date-boundary ambiguity.
const ANCHOR = new Date('2026-11-16T09:30:00Z')
const DAY_MS = 86400000

const sign = (slug: string) => {
  const s = getSunSignBySlug(slug)
  if (!s) throw new Error(`unknown sign ${slug}`)
  return s
}

function words(s: string): number {
  return s.trim().split(/\s+/).length
}

function assertClean(text: string, label: string) {
  expect(text.length, `${label} empty`).toBeGreaterThan(0)
  expect(text, `${label} contains undefined`).not.toMatch(/undefined|NaN|\{[a-zA-Z]+\}/)
}

describe('pure helpers (no ephemeris)', () => {
  it('signDistance folds to 0..6 and is symmetric', () => {
    const aries = sign('aries')
    expect(signDistance(aries, aries)).toBe(0)
    expect(signDistance(aries, sign('taurus'))).toBe(1)
    expect(signDistance(aries, sign('gemini'))).toBe(2)
    expect(signDistance(aries, sign('cancer'))).toBe(3)
    expect(signDistance(aries, sign('leo'))).toBe(4)
    expect(signDistance(aries, sign('virgo'))).toBe(5)
    expect(signDistance(aries, sign('libra'))).toBe(6)
    expect(signDistance(aries, sign('scorpio'))).toBe(5)
    expect(signDistance(aries, sign('pisces'))).toBe(1)
    expect(signDistance(sign('pisces'), aries)).toBe(1)
  })

  it('moonRelationForDistance maps every distance', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(moonRelationForDistance)).toEqual([
      'same',
      'semi-sextile',
      'sextile',
      'square',
      'trine',
      'quincunx',
      'opposition',
    ])
  })

  it('elementHarmony: Fire–Air and Earth–Water are compatible, the rest clash', () => {
    expect(elementHarmony('Fire', 'Fire')).toBe('same')
    expect(elementHarmony('Fire', 'Air')).toBe('compatible')
    expect(elementHarmony('Water', 'Earth')).toBe('compatible')
    expect(elementHarmony('Fire', 'Water')).toBe('clashing')
    expect(elementHarmony('Air', 'Earth')).toBe('clashing')
  })

  it('aspectBetween honours the orbs (8/6/4, Moon 4)', () => {
    expect(aspectBetween('Venus', 15, 15)).toEqual({ aspect: 'conjunction', orb: 0 })
    expect(aspectBetween('Venus', 22.5, 15)?.aspect).toBe('conjunction') // 7.5° < 8°
    expect(aspectBetween('Venus', 24, 15)).toBeNull() // 9° — outside every orb
    expect(aspectBetween('Mars', 15 + 120 + 5.9, 15)?.aspect).toBe('trine')
    expect(aspectBetween('Mars', 15 + 120 + 6.5, 15)).toBeNull()
    expect(aspectBetween('Sun', 15 + 60 + 3.9, 15)?.aspect).toBe('sextile')
    expect(aspectBetween('Sun', 15 + 60 + 4.5, 15)).toBeNull()
    expect(aspectBetween('Moon', 15 + 180 + 5, 15)).toBeNull() // Moon orb is 4° even for opposition
    expect(aspectBetween('Moon', 15 + 180 + 3, 15)?.aspect).toBe('opposition')
    // wrap-around
    expect(aspectBetween('Jupiter', 358, 5)?.aspect).toBe('conjunction')
  })

  it('utcDateString / utcDayIndex use the UTC calendar date', () => {
    expect(utcDateString(new Date('2026-11-16T23:59:00Z'))).toBe('2026-11-16')
    expect(utcDateString(new Date('2026-11-16T00:00:00Z'))).toBe('2026-11-16')
    expect(utcDayIndex('2026-11-17') - utcDayIndex('2026-11-16')).toBe(1)
  })

  it('pickVariant rotates across days and separates sides', () => {
    const bank = ['a', 'b', 'c']
    const day = 1000
    expect(pickVariant(bank, day, 0, 0)).not.toBe(pickVariant(bank, day + 1, 0, 0))
    expect(pickVariant(bank, day, 0, 0)).not.toBe(pickVariant(bank, day, 1, 0))
    // deterministic
    expect(pickVariant(bank, day, 1, 5)).toBe(pickVariant(bank, day, 1, 5))
  })

  it('shared banks have exactly SHARED_BANK_SIZE variants so 12 signs never collide', () => {
    expect(SHARED_BANK_SIZE).toBe(12)
    for (const list of Object.values(HEADLINES)) expect(list).toHaveLength(SHARED_BANK_SIZE)
    for (const list of Object.values(LOVE_TONE_COPY)) expect(list).toHaveLength(SHARED_BANK_SIZE)
    for (const list of Object.values(PHASE_MONEY_COPY)) expect(list).toHaveLength(SHARED_BANK_SIZE)
    for (const list of Object.values(PHASE_COPY)) expect(list).toHaveLength(SHARED_BANK_SIZE)
  })

  it('headlines are nine words or fewer and every sign has a profile', () => {
    for (const list of Object.values(HEADLINES)) {
      for (const h of list) expect(words(h), h).toBeLessThanOrEqual(9)
    }
    for (const s of SUN_SIGNS) {
      const p = SIGN_PROFILES[s.slug]
      expect(p, s.slug).toBeDefined()
      expect(p.strengths).toHaveLength(3)
      expect(p.watchOuts).toHaveLength(3)
      expect(p.howToRead.length).toBeGreaterThan(40)
    }
  })
})

describeWithEphemeris('determinism (real ephemeris)', () => {
  it('same now → deep-equal result', () => {
    const a = computeSunSignDaily(sign('leo'), ANCHOR)
    const b = computeSunSignDaily(sign('leo'), new Date(ANCHOR.getTime()))
    expect(a).toEqual(b)
  })

  it('any time on the same UTC date gives the same reading', () => {
    const a = computeSunSignDaily(sign('virgo'), new Date('2026-11-16T00:00:01Z'))
    const b = computeSunSignDaily(sign('virgo'), new Date('2026-11-16T23:59:59Z'))
    expect(a).toEqual(b)
  })

  it('the next UTC date is a different reading', () => {
    const a = computeSunSignDaily(sign('virgo'), new Date('2026-11-16T23:59:59Z'))
    const b = computeSunSignDaily(sign('virgo'), new Date('2026-11-17T00:00:01Z'))
    expect(b.date).toBe('2026-11-17')
    expect(a.summary).not.toBe(b.summary)
  })
})

describeWithEphemeris('variety and sanity (real ephemeris)', () => {
  it('different signs on the same day are not all the same grade', () => {
    const grades = new Set(computeAllSunSignDaily(ANCHOR).map((d) => d.grade))
    expect(grades.size).toBeGreaterThan(1)
  })

  it('over 30 consecutive days no sign repeats one grade more than 20 times', () => {
    for (const s of SUN_SIGNS) {
      const counts: Record<number, number> = {}
      for (let i = 0; i < 30; i++) {
        const g = computeSunSignDaily(s, new Date(ANCHOR.getTime() + i * DAY_MS)).grade
        counts[g] = (counts[g] ?? 0) + 1
      }
      for (const [g, n] of Object.entries(counts)) {
        expect(n, `${s.slug} grade ${g} repeated ${n} times`).toBeLessThanOrEqual(20)
      }
    }
  })

  it('every text field is non-empty and free of undefined/placeholders; receipt non-empty', () => {
    for (let i = 0; i < 30; i++) {
      for (const d of computeAllSunSignDaily(new Date(ANCHOR.getTime() + i * DAY_MS))) {
        const label = `${d.sign.slug} ${d.date}`
        expect(d.grade).toBeGreaterThanOrEqual(1)
        expect(d.grade).toBeLessThanOrEqual(5)
        assertClean(d.headline, `${label} headline`)
        expect(words(d.headline)).toBeLessThanOrEqual(9)
        assertClean(d.summary, `${label} summary`)
        assertClean(d.directAnswer, `${label} directAnswer`)
        expect(words(d.directAnswer), `${label} directAnswer words`).toBeGreaterThanOrEqual(40)
        expect(words(d.directAnswer), `${label} directAnswer words`).toBeLessThanOrEqual(70)
        assertClean(d.areas.love, `${label} love`)
        assertClean(d.areas.work, `${label} work`)
        assertClean(d.areas.money, `${label} money`)
        assertClean(d.doToday, `${label} do`)
        assertClean(d.avoidToday, `${label} avoid`)
        expect(d.luckyWindow).toMatch(/^\d{2}:00–\d{2}:00 UTC$/)
        expect(d.receipt.length).toBeGreaterThan(0)
        for (const r of d.receipt) {
          assertClean(r.factor, `${label} receipt factor`)
          assertClean(r.detail, `${label} receipt detail`)
          expect(Number.isFinite(r.weight)).toBe(true)
        }
        expect(d.moonSign.length).toBeGreaterThan(0)
        expect(d.moonPhaseName.length).toBeGreaterThan(0)
        expect(Array.isArray(d.retrogrades)).toBe(true)
        // the receipt total is the score behind the grade
        const total = d.receipt.reduce((acc, r) => acc + r.weight, 0)
        expect(Math.round(total * 10) / 10).toBe(d.score)
      }
    }
  })

  it('on any given day the 12 signs never share a headline, summary, area text, do or avoid', () => {
    const fields = ['headline', 'summary', 'doToday', 'avoidToday'] as const
    for (let i = 0; i < 30; i++) {
      const all = computeAllSunSignDaily(new Date(ANCHOR.getTime() + i * DAY_MS))
      for (const f of fields) {
        expect(new Set(all.map((d) => d[f])).size, `${f} day ${i}`).toBe(12)
      }
      for (const area of ['love', 'work', 'money'] as const) {
        expect(new Set(all.map((d) => d.areas[area])).size, `${area} day ${i}`).toBe(12)
      }
    }
  })

  it('a sign never shows the same headline or summary two days running', () => {
    for (const s of SUN_SIGNS) {
      let prev = computeSunSignDaily(s, ANCHOR)
      for (let i = 1; i < 30; i++) {
        const cur = computeSunSignDaily(s, new Date(ANCHOR.getTime() + i * DAY_MS))
        expect(cur.headline, `${s.slug} day ${i}`).not.toBe(prev.headline)
        expect(cur.summary, `${s.slug} day ${i}`).not.toBe(prev.summary)
        prev = cur
      }
    }
  })

  it('week has 7 entries starting today; tomorrow is today + 1', () => {
    const week = computeSunSignWeek(sign('leo'), ANCHOR)
    expect(week).toHaveLength(7)
    expect(week[0].date).toBe('2026-11-16')
    expect(week[0].isToday).toBe(true)
    expect(week.slice(1).every((w) => !w.isToday)).toBe(true)
    expect(week.map((w) => w.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ])
    expect(week.map((w) => w.weekdayShort)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ])
    const tomorrow = computeSunSignTomorrow(sign('leo'), ANCHOR)
    expect(tomorrow.date).toBe('2026-11-17')
    expect(tomorrow.grade).toBe(week[1].grade)
    expect(tomorrow.headline).toBe(week[1].headline)
  })
})

describeWithEphemeris('snapshot — 2026-11-16 (real ephemeris)', () => {
  // Pinned from a run against public/ephe. The Moon is at 13° Aquarius, waxing
  // crescent; Saturn, Uranus and Neptune are retrograde. If the weights or the
  // text bank change on purpose, update these values deliberately.
  it('shared sky facts', () => {
    for (const d of computeAllSunSignDaily(ANCHOR)) {
      expect(d.date).toBe('2026-11-16')
      expect(d.dateLabel).toBe('November 16, 2026')
      expect(d.weekday).toBe('Monday')
      expect(d.moonSign).toBe('Aquarius')
      expect(d.moonPhase).toBe('waxing_crescent')
      expect(d.moonPhaseName).toBe('Waxing Crescent')
      expect(d.retrogrades).toEqual(['Saturn', 'Uranus', 'Neptune'])
    }
  })

  it('Aries', () => {
    const d = computeSunSignDaily(sign('aries'), ANCHOR)
    expect(d.moonRelation).toBe('sextile')
    expect(d.grade).toBe(4)
    expect(d.score).toBe(3)
    expect(d.headline).toBe('Small pushes go far today')
    expect(d.luckyWindow).toBe('12:00–15:00 UTC')
    expect(d.planetsInSign).toEqual(['Saturn', 'Neptune'])
    expect(d.ruler).toEqual({
      planet: 'Mars',
      sign: 'Leo',
      element: 'Fire',
      harmony: 'same',
      retrograde: false,
    })
    expect(d.receipt).toHaveLength(10)
    expect(d.receipt[0]).toEqual({
      factor: 'Moon sign',
      detail: 'Moon at 13° Aquarius, sextile your sign (2 signs away)',
      weight: 1,
    })
    expect(d.aspects.map((a) => `${a.planet} ${a.aspect}`)).toEqual([
      'Moon sextile',
      'Saturn conjunction',
      'Venus opposition',
    ])
  })

  it('Leo', () => {
    const d = computeSunSignDaily(sign('leo'), ANCHOR)
    expect(d.moonRelation).toBe('opposition')
    expect(d.grade).toBe(3)
    expect(d.score).toBe(0)
    expect(d.headline).toBe('Quiet progress beats loud plans')
    expect(d.luckyWindow).toBe('00:00–03:00 UTC')
    expect(d.planetsInSign).toEqual(['Mars', 'Jupiter'])
    expect(d.ruler.planet).toBe('Sun')
    expect(d.ruler.sign).toBe('Scorpio')
    expect(d.ruler.harmony).toBe('clashing')
    expect(d.receipt).toHaveLength(8)
    expect(d.receipt[0]).toEqual({
      factor: 'Moon sign',
      detail: 'Moon at 13° Aquarius, opposite your sign (6 signs away)',
      weight: -1,
    })
    expect(computeSunSignWeek(sign('leo'), ANCHOR).map((w) => w.grade)).toEqual([
      3, 3, 3, 3, 4, 4, 3,
    ])
  })

  it('Pisces', () => {
    const d = computeSunSignDaily(sign('pisces'), ANCHOR)
    expect(d.moonRelation).toBe('semi-sextile')
    expect(d.grade).toBe(3)
    expect(d.score).toBe(-0.5)
    expect(d.headline).toBe('Mixed signals, clear enough to work with')
    expect(d.luckyWindow).toBe('15:00–18:00 UTC')
    expect(d.planetsInSign).toEqual([])
    expect(d.aspects).toEqual([])
    expect(d.ruler.planet).toBe('Jupiter')
    expect(d.ruler.sign).toBe('Leo')
    expect(d.receipt).toHaveLength(5)
    expect(d.receipt[0]).toEqual({
      factor: 'Moon sign',
      detail: 'Moon at 13° Aquarius, semi-sextile your sign (1 sign away)',
      weight: 0,
    })
  })

  it('all twelve grades on the anchor date', () => {
    expect(computeAllSunSignDaily(ANCHOR).map((d) => [d.sign.slug, d.grade])).toEqual([
      ['aries', 4],
      ['taurus', 2],
      ['gemini', 4],
      ['cancer', 2],
      ['leo', 3],
      ['virgo', 3],
      ['libra', 5],
      ['scorpio', 2],
      ['sagittarius', 4],
      ['capricorn', 3],
      ['aquarius', 4],
      ['pisces', 3],
    ])
  })
})

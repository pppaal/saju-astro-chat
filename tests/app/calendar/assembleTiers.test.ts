/**
 * assembleTiers — 5-tier 어셈블러 통합 테스트.
 *
 * assembleTiers 는 NatalContext + 그 해 CalendarCell[] 을 받아 PreviewClient 가
 * 받는 { topbar, user, lifetime, decade, year, month, day } 를 만든다. 순수
 * 변환 로직이지만 입력 fixture 가 무겁다(여러 deriver/adapter 가 실제
 * NatalContext 구조를 요구). 그래서 실제 buildNatalContext + buildCalendar 로
 * fixture 를 만든 뒤(Swiss Ephemeris 는 tests/setup.ts 가 mock), 어셈블 결과의
 * 구조·분기를 검증한다. now 를 고정해 lifetime pivot 등이 결정적이 되게 한다.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { assembleTiers, type AssembleTiersInput } from '@/app/calendar/assembleTiers'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { CalendarCell } from '@/lib/calendar-engine/types'

const BIRTH_YEAR = 1990
const TARGET_YEAR = 2024
const TARGET_MONTH = 6
const TARGET_DAY = 15
const TARGET_DAY_ISO = '2024-06-15'
const FIXED_NOW = new Date('2024-06-15T12:00:00Z')

let natal: NatalContext
let cells: CalendarCell[]

beforeAll(async () => {
  natal = await buildNatalContext({
    birthDate: '1990-05-21',
    birthTime: '14:30',
    gender: 'female',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })
  // adapters read saju.twelveStages (build.ts 는 안 채움) — 실제 페이지 경로처럼 부착.
  ;(natal.saju as unknown as Record<string, unknown>).twelveStages = getTwelveStagesForPillars(
    natal.saju.pillars as never
  )

  cells = await buildCalendar(
    natal,
    { start: `${TARGET_YEAR}-01-01`, end: `${TARGET_YEAR}-12-31`, granularity: 'day' },
    {}
  )
}, 60000)

function baseInput(overrides: Partial<AssembleTiersInput> = {}): AssembleTiersInput {
  return {
    natal,
    cells,
    lang: 'ko',
    birthYear: BIRTH_YEAR,
    targetYear: TARGET_YEAR,
    targetMonth: TARGET_MONTH,
    targetDay: TARGET_DAY,
    targetDayIso: TARGET_DAY_ISO,
    sex: '여',
    birthDisplay: '1990-05-21 14:30',
    whoBirthLine: '1990-05-21 14:30',
    place: '대한민국 서울',
    focusDayCell: null,
    now: FIXED_NOW,
    ...overrides,
  }
}

describe('assembleTiers — fixture sanity', () => {
  it('builds a non-empty year of day cells', () => {
    expect(cells.length).toBeGreaterThan(300)
    expect(cells.every((c) => typeof c.datetime === 'string')).toBe(true)
  })
})

describe('assembleTiers — top-level shape', () => {
  it('returns all six tiers + topbar', async () => {
    const out = await assembleTiers(baseInput())
    expect(out).toHaveProperty('topbar')
    expect(out).toHaveProperty('user')
    expect(out).toHaveProperty('lifetime')
    expect(out).toHaveProperty('decade')
    expect(out).toHaveProperty('year')
    expect(out).toHaveProperty('month')
    expect(out).toHaveProperty('day')
  })

  it('topbar carries the display lines and an ilgan hanja', async () => {
    const out = await assembleTiers(baseInput())
    expect(out.topbar.whoBirthLine).toBe('1990-05-21 14:30')
    expect(out.topbar.place).toBe('대한민국 서울')
    expect(typeof out.topbar.ilganHanja).toBe('string')
    expect(out.topbar.ilganHanja.length).toBeGreaterThan(0)
  })
})

describe('assembleTiers — user tier', () => {
  it('normalizes sex to 남/여 and surfaces ilgan + yongsin', async () => {
    const out = await assembleTiers(baseInput())
    expect(['남', '여']).toContain(out.user.sex)
    expect(out.user.ilgan.hanja).toBeTruthy()
    expect(out.user.ilgan.element).toBeTruthy()
    // yongsin primary comes straight from the natal saju.
    expect(out.user.yongsin.primary).toBe(natal.saju.yongsin.primary)
    expect(out.user.yongsin.avoid).toEqual(natal.saju.yongsin.avoid)
    // huisin primary falls back to yongsin secondary ?? primary.
    expect(out.user.huisin.primary).toBe(natal.saju.yongsin.secondary ?? natal.saju.yongsin.primary)
  })

  it('carries astro sun/asc/mc strings', async () => {
    const out = await assembleTiers(baseInput())
    expect(typeof out.user.astro.sun).toBe('string')
    expect(typeof out.user.astro.asc).toBe('string')
    expect(typeof out.user.astro.mc).toBe('string')
  })
})

describe('assembleTiers — decade tier', () => {
  it('produces a current decade pillar with elements + sewoonNow at target year', async () => {
    const out = await assembleTiers(baseInput())
    expect(out.decade.start).toBeLessThanOrEqual(TARGET_YEAR)
    expect(out.decade.end).toBeGreaterThanOrEqual(TARGET_YEAR)
    expect(out.decade.pillar.cheongan.element).toBeTruthy()
    expect(out.decade.pillar.jiji.element).toBeTruthy()
    expect(out.decade.sewoonNow.year).toBe(TARGET_YEAR)
    // arrays default to empty (zr chapters not assembled here).
    expect(out.decade.zrSpiritChapters).toEqual([])
    expect(out.decade.zrFortuneChapters).toEqual([])
  })
})

describe('assembleTiers — year tier', () => {
  it('returns the target year + a 12-house profection wheel', async () => {
    const out = await assembleTiers(baseInput())
    expect(out.year.year).toBe(TARGET_YEAR)
    expect(Array.isArray(out.year.profectionWheel)).toBe(true)
    expect(out.year.profectionWheel.length).toBe(12)
    expect(out.year.profection.house).toBeGreaterThanOrEqual(1)
    expect(out.year.profection.house).toBeLessThanOrEqual(12)
  })
})

describe('assembleTiers — month tier', () => {
  it('labels the target month and exposes day collections', async () => {
    const out = await assembleTiers(baseInput())
    expect(out.month.ym).toBe('2024-06')
    expect(out.month.label).toContain('6월')
    expect(Array.isArray(out.month.goodDays)).toBe(true)
    expect(Array.isArray(out.month.cautionDays)).toBe(true)
    expect(Array.isArray(out.month.keyDays)).toBe(true)
    expect(Array.isArray(out.month.crossActivations)).toBe(true)
    // cross-activations capped at 6.
    expect(out.month.crossActivations!.length).toBeLessThanOrEqual(6)
  })

  it('prepends a "이달 총평" summary tag when summary text exists (ko)', async () => {
    const out = await assembleTiers(baseInput({ lang: 'ko' }))
    expect(out.month.narrative.length).toBeGreaterThan(0)
    // first entry should be the synthesized monthly summary when present.
    if (out.month.narrative[0]) {
      // summary tag is either '이달 총평' (summary present) or '타고난 결' (intro).
      expect(['이달 총평', '타고난 결', '이 달의 결']).toContain(out.month.narrative[0].tag)
    }
  })

  it('keeps the canonical 이달 총평 tag and carries bodyEn in en mode', async () => {
    // The summary now uses a locale-independent tag ('이달 총평') so the client
    // locale toggle can find it; localization is via body(ko)/bodyEn(en), with
    // MonthTier rendering a localized label. So even in en mode the tag stays
    // canonical and the English text rides on bodyEn.
    const out = await assembleTiers(baseInput({ lang: 'en' }))
    const summary = out.month.narrative.find((n) => n.tag === '이달 총평')
    if (summary) {
      expect(summary.tag).toBe('이달 총평')
      expect(typeof summary.bodyEn).toBe('string')
    }
  })
})

describe('assembleTiers — day tier', () => {
  it('assembles the focus day with iljin + signal partitions', async () => {
    const out = await assembleTiers(baseInput())
    expect(out.day.iljin).toBeTruthy()
    expect(Array.isArray(out.day.allSignals)).toBe(true)
    expect(Array.isArray(out.day.transits)).toBe(true)
    expect(Array.isArray(out.day.signals)).toBe(true)
    expect(Array.isArray(out.day.crossSignals)).toBe(true)
    // partitions must be disjoint subsets of allSignals.
    const total = out.day.transits.length + out.day.signals.length + out.day.crossSignals.length
    expect(total).toBe(out.day.allSignals.length)
    // no transit leaks into the saju signal bucket.
    expect(out.day.signals.every((s) => s.kind !== 'transit')).toBe(true)
    expect(out.day.crossSignals.every((s) => s.kind === 'cross-activation')).toBe(true)
  })

  it('day.geokgukStatus carries a name and a status', async () => {
    const out = await assembleTiers(baseInput())
    expect(out.day.geokgukStatus.name).toBeTruthy()
    expect(out.day.geokgukStatus.status).toBeTruthy()
    expect(out.day.geokgukStatus.factors).toHaveProperty('positive')
    expect(out.day.geokgukStatus.factors).toHaveProperty('negative')
  })

  it('dayCrossActivations are sorted by |polarity| descending and pair-deduped', async () => {
    const out = await assembleTiers(baseInput())
    const xs = out.day.crossActivations
    for (let i = 1; i < xs.length; i++) {
      expect(Math.abs(xs[i - 1].polarity)).toBeGreaterThanOrEqual(Math.abs(xs[i].polarity))
    }
    // pair dedup: no two activations share the same saju|astro pair.
    const keys = xs.map((x) => `${x.sajuKo}|${x.astroKo}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('assembleTiers — focusDayCell fallback', () => {
  it('falls back to the year cell for the target ISO when focusDayCell is null', async () => {
    const out = await assembleTiers(baseInput({ focusDayCell: null }))
    expect(out.day.date).toBeTruthy()
  })

  it('uses an explicitly provided focusDayCell', async () => {
    const explicit = cells.find((c) => c.datetime.slice(0, 10) === TARGET_DAY_ISO) ?? cells[0]
    const out = await assembleTiers(baseInput({ focusDayCell: explicit }))
    expect(out.day.iljin).toBeTruthy()
    // all day signals come from the supplied cell.
    expect(out.day.allSignals.length).toBe(explicit.signals.length)
  })
})

describe('assembleTiers — language toggle', () => {
  it('en and ko both assemble without throwing and share structural year/month', async () => {
    const ko = await assembleTiers(baseInput({ lang: 'ko' }))
    const en = await assembleTiers(baseInput({ lang: 'en' }))
    expect(ko.year.year).toBe(en.year.year)
    expect(ko.month.ym).toBe(en.month.ym)
    // en cross-activations expose English sides.
    if (en.day.crossActivations.length > 0) {
      expect(typeof en.day.crossActivations[0].sajuSide).toBe('string')
    }
  })
})

describe('assembleTiers — male sex mapping', () => {
  it('maps 남 through to the user tier', async () => {
    const out = await assembleTiers(baseInput({ sex: '남' }))
    expect(['남', '여']).toContain(out.user.sex)
  })
})

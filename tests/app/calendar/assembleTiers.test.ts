/**
 * assembleTiers — /calendar 월/일 어셈블러 통합 테스트.
 *
 * assembleTiers 는 NatalContext + 그 해 CalendarCell[] 을 받아 CalendarClient 가
 * 받는 { topbar, user, month, day } 를 만든다(인생 티어는 /destiny 의
 * assembleLifetime 전용 — 캘린더는 계산·전송하지 않는다). 순수 변환 로직이지만
 * 입력 fixture 가 무겁다(여러 deriver/adapter 가 실제 NatalContext 구조를 요구).
 * 그래서 실제 buildNatalContext + buildCalendar 로 fixture 를 만든 뒤(Swiss
 * Ephemeris 는 tests/setup.ts 가 mock), 어셈블 결과의 구조·분기를 검증한다.
 * now 를 고정해 만 나이·일 티어가 결정적이 되게 한다.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { assembleTiers, type AssembleTiersInput } from '@/app/calendar/assembleTiers'
import { pickNextBigDay } from '@/app/calendar/assembleDayTier'

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
  it('returns month/day tiers + topbar only (인생·10년·1년 티어 없음)', async () => {
    const out = await assembleTiers(baseInput())
    expect(Object.keys(out).sort()).toEqual(['day', 'month', 'topbar', 'user'])
    // 인생 티어는 /destiny(assembleLifetime) 전용 — 캘린더는 숨은 life 를 싣지 않는다.
    expect(out).not.toHaveProperty('lifetime')
    // 중간 티어는 제거 — 대운은 인생 흐름이, 세운은 인생 흐름 한 줄+캘린더가 커버.
    expect(out).not.toHaveProperty('decade')
    expect(out).not.toHaveProperty('year')
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

// (10년 대운·1년 세운 티어는 제거 — assembleTiers 는 더 이상 decade/year 를 내지
//  않는다. 대운은 인생 흐름(LifetimeTier)이, 세운은 인생 흐름 thisYear 한 줄이
//  커버하고 assembleLifetime.test 가 검증한다.)

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

  it('narrative carries only the "이달 총평" summary (ko)', async () => {
    const out = await assembleTiers(baseInput({ lang: 'ko' }))
    expect(out.month.narrative.length).toBe(1)
    // MonthTier 가 읽는 건 '이달 총평' 뿐 — 예전의 '타고난 결'·'이 달의 결' 항목은
    // 표시되지 않던 페이로드라 더 이상 싣지 않는다.
    expect(out.month.narrative.map((n) => n.tag)).toEqual(['이달 총평'])
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
  it('en and ko both assemble without throwing and share structural month', async () => {
    const ko = await assembleTiers(baseInput({ lang: 'ko' }))
    const en = await assembleTiers(baseInput({ lang: 'en' }))
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

describe('pickNextBigDay — 다가오는 큰 날 D-day', () => {
  const iso = '2024-06-15'
  it('앞으로 며칠 중 최고 좋은 날(≥60, good 밴드)을 D-day 로 고른다', () => {
    const r = pickNextBigDay(
      [
        { date: '2024-06-16', score: 52 },
        { date: '2024-06-18', score: 71 }, // 최고
        { date: '2024-06-19', score: 66 },
      ],
      iso
    )
    expect(r).toEqual({ date: '2024-06-18', dDay: 3, score: 71 })
  })

  it('good 밴드(60) 미만뿐이면 null(과장된 "큰 날" 안 만든다)', () => {
    expect(
      pickNextBigDay(
        [
          { date: '2024-06-16', score: 52 },
          { date: '2024-06-17', score: 59 },
        ],
        iso
      )
    ).toBeNull()
  })

  it('그리드 초록(60~64)도 이제 포함된다(SSOT 밴드 일치)', () => {
    const r = pickNextBigDay([{ date: '2024-06-16', score: 62 }], iso)
    expect(r).toEqual({ date: '2024-06-16', dDay: 1, score: 62 })
  })

  it('빈 배열/오늘 이전 날짜는 null', () => {
    expect(pickNextBigDay([], iso)).toBeNull()
    // 방어적: dDay<1 이면(과거·오늘) 제외.
    expect(pickNextBigDay([{ date: '2024-06-15', score: 90 }], iso)).toBeNull()
  })

  it('월 경계를 넘어도 D-day 를 정확히 센다', () => {
    const r = pickNextBigDay([{ date: '2024-07-01', score: 80 }], '2024-06-28')
    expect(r).toEqual({ date: '2024-07-01', dDay: 3, score: 80 })
  })
})

describe('assembleTiers — day.nextBigDay 연결', () => {
  it('nextBigDay 는 null 이거나 유효한 D-day(≥1, score≥60, upcoming 내 날짜)다', async () => {
    const out = await assembleTiers(baseInput())
    const nb = out.day.nextBigDay
    if (nb) {
      expect(nb.dDay).toBeGreaterThanOrEqual(1)
      expect(nb.score).toBeGreaterThanOrEqual(60)
      expect(out.day.upcoming?.some((u) => u.date === nb.date && u.score === nb.score)).toBe(true)
    }
  })
})

// (세운 입춘 경계 SSOT 는 이제 assembleLifetime.thisYear 가 담당 —
//  assembleLifetime.test.ts 로 이관.)

describe('assembleTiers — 캘린더는 숨은 인생 티어를 계산하지 않는다', () => {
  it('user 에 인생 흐름 intro(lifetimeFlow) 가 실리지 않는다', async () => {
    const out = await assembleTiers(baseInput())
    // toUser 는 intro 미주입 시 빈 문자열 — lifetimeFlow 를 돌리지 않았다는 뜻.
    expect(out.user.intro ?? '').toBe('')
  })

  it('month 에 converge 자리표시자가 없다(미배선 plumbing 제거)', async () => {
    const out = await assembleTiers(baseInput())
    expect(out.month).not.toHaveProperty('converge')
    expect(out.month.calendar.every((c) => c.mark !== ('converge' as never))).toBe(true)
  })

  it('같은 입력·같은 now 면 월/일 결과가 같다(결정론)', async () => {
    const [a, b] = await Promise.all([assembleTiers(baseInput()), assembleTiers(baseInput())])
    expect(b.month).toEqual(a.month)
    expect(b.day).toEqual(a.day)
  })
})

describe('assembleTiers — 월 리드아웃 ↔ 일 티어 문장 통일', () => {
  it('월 그리드 셀의 oneLine 이 일 티어 oneLine 과 동일하다(예고편=본편)', async () => {
    const out = await assembleTiers(baseInput())
    const focusDs = out.day.date.slice(5) // 'MM-DD'
    const cell = out.month.calendar.find((c) => c.ds === focusDs)
    expect(cell?.oneLine).toBeTruthy()
    expect(cell?.oneLine).toBe(out.day.oneLine)
    expect(cell?.oneLineEn).toBe(out.day.oneLineEn)
  })

  it('모든 달력 셀에 화해된 한 줄이 실린다', async () => {
    const out = await assembleTiers(baseInput())
    for (const cell of out.month.calendar) {
      expect(cell.oneLine, `day ${cell.d} missing oneLine`).toBeTruthy()
    }
  })
})

// ── 계획 B1 (엔진 E10) ────────────────────────────────────────────────────────
// 월 화면 assemble-layer: 그리드 마크 부호와 맞는 '왜'(#4).

const pad2 = (n: number) => String(n).padStart(2, '0')

function monthInput(month: number, day: number, overrides: Partial<AssembleTiersInput> = {}) {
  return baseInput({
    targetMonth: month,
    targetDay: day,
    targetDayIso: `${TARGET_YEAR}-${pad2(month)}-${pad2(day)}`,
    ...overrides,
  })
}

describe("assembleTiers — '왜' 부호 게이트 (계획 B1 #4)", () => {
  it('caution·avoid 셀의 근거는 없거나 −, good·best 셀은 없거나 +', async () => {
    let reasons = 0
    for (const m of [3, 6, 11]) {
      const out = await assembleTiers(monthInput(m, 15))
      for (const c of out.month.calendar) {
        if (!c.reason) continue
        reasons++
        expect(c.reason.polarity, `${m}/${c.d}`).not.toBe(0)
        if (c.mark === 'caution' || c.mark === 'avoid') {
          expect(c.reason.polarity, `${m}/${c.d} ${c.mark}`).toBeLessThan(0)
        }
        if (c.mark === 'good' || c.mark === 'best') {
          expect(c.reason.polarity, `${m}/${c.d} ${c.mark}`).toBeGreaterThan(0)
        }
      }
    }
    expect(reasons).toBeGreaterThan(0)
  }, 60000)
})

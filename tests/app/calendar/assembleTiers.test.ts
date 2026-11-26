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
import { pickTryThis, toMMDD } from '@/lib/calendar-engine/derivers/tryThis'

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

describe('assembleTiers — 월운 머리말 = 셀과 같은 절기월 (재감사 G2 · TP-2)', () => {
  it('woolun 은 이 달에 시작하는 절기월, woolunSpans 는 실제로 걸친 두 절기월', async () => {
    const out = await assembleTiers(baseInput())
    // 망종 2024-06-05 13:10 KST → 서울 06-05 부터 庚午월, 06-01~04 는 己巳월.
    expect(out.month.woolun.hanja).toBe('庚午')
    expect(out.month.woolunSpans).toEqual([
      { woolun: { hanja: '己巳', kr: '기사', en: 'gisa' }, fromDay: 1, toDay: 4 },
      { woolun: { hanja: '庚午', kr: '경오', en: 'gyeongo' }, fromDay: 5, toDay: 30 },
    ])
    // 그리드 첫 주의 saju-pillar 월운이 머리말 범위와 같다.
    const wolunOf = (iso: string) =>
      cells
        .find((c) => c.datetime.startsWith(iso))!
        .signals.filter((s) => s.id.startsWith('saju.pillar-sibsin.wolun.'))
        .map((s) => s.name.slice(0, 2))
    expect(wolunOf('2024-06-04')).toEqual(['己巳'])
    expect(wolunOf('2024-06-05')).toEqual(['庚午'])
  })
})

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
//  않는다. 대운은 인생 흐름(/destiny LifeFlow)이, 세운은 인생 흐름 thisYear 한 줄이
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
// 월 화면 assemble-layer: 여는 날짜와 무관한 버킷(#2), 지난 날을 짚지 않는 총평(#3),
// 그리드 마크 부호와 맞는 '왜'(#4).

const pad2 = (n: number) => String(n).padStart(2, '0')

function monthInput(month: number, day: number, overrides: Partial<AssembleTiersInput> = {}) {
  return baseInput({
    targetMonth: month,
    targetDay: day,
    targetDayIso: `${TARGET_YEAR}-${pad2(month)}-${pad2(day)}`,
    ...overrides,
  })
}

/** 밴드 마크와 화해 톤이 어긋난 날(tense: good 밴드인데 톤≠positive / bright: 낮은 밴드인데 톤≠caution). */
function isToneMismatch(c: { mark: string | null; tone?: string }): boolean {
  if (c.mark === 'good' || c.mark === 'best') return c.tone !== undefined && c.tone !== 'positive'
  if (c.mark === 'caution' || c.mark === 'avoid')
    return c.tone !== undefined && c.tone !== 'caution'
  return false
}

describe('assembleTiers — 월 버킷은 여는 날짜와 무관 (계획 B1 #2)', () => {
  it('톤이 밴드와 어긋난 날을 열어도 good/caution/avoid·verdict·bestDay 가 같고, 포커스 셀은 밴드 마크를 지킨다', async () => {
    // 그런 날이 있는 달을 찾는다(fixture 결정적).
    let found: { month: number; day: number; mark: string } | null = null
    for (const m of [6, 3, 9, 11, 1, 4, 7, 10, 12, 2, 5, 8]) {
      const probe = await assembleTiers(monthInput(m, 15))
      const cell = probe.month.calendar.find((c) => c.d !== 15 && isToneMismatch(c))
      if (cell && cell.mark) {
        found = { month: m, day: cell.d, mark: cell.mark }
        break
      }
    }
    expect(found, 'fixture 연도에 톤·밴드가 어긋난 날이 하나는 있어야 한다').not.toBeNull()
    const { month, day, mark } = found!
    const other = day === 15 ? 16 : 15

    const [onIt, elsewhere] = await Promise.all([
      assembleTiers(monthInput(month, day)),
      assembleTiers(monthInput(month, other)),
    ])
    expect(onIt.month.goodDays).toEqual(elsewhere.month.goodDays)
    expect(onIt.month.cautionDays).toEqual(elsewhere.month.cautionDays)
    expect(onIt.month.avoidDays).toEqual(elsewhere.month.avoidDays)
    expect(onIt.month.verdict).toEqual(elsewhere.month.verdict)
    expect(onIt.month.bestDay).toEqual(elsewhere.month.bestDay)

    const focusCell = onIt.month.calendar.find((c) => c.d === day)!
    expect(focusCell.focus).toBe(true)
    expect(focusCell.mark).toBe(mark)
    // 그리드 마크도 포커스 링 외에는 같다.
    const marks = (xs: typeof onIt.month.calendar) =>
      xs.map((c) => (c.mark === 'focus' ? null : c.mark))
    expect(marks(onIt.month.calendar)).toEqual(marks(elsewhere.month.calendar))
  }, 60000)
})

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

describe('assembleTiers — 이달 총평은 지난 날을 짚지 않는다 (계획 B1 #3)', () => {
  const koDate = (mmdd: string) => {
    const [m, d] = mmdd.split('-').map(Number)
    return new RegExp(`(^|[^0-9])${m}월 ${d}일`)
  }

  it('기준일 이전의 조심·피할 날은 총평에 없고, 짚는 날은 pickTryThis 와 같다', async () => {
    let checkedPast = 0
    for (const day of [12, 20, 26]) {
      const out = await assembleTiers(monthInput(TARGET_MONTH, day))
      const body = out.month.narrative.find((n) => n.tag === '이달 총평')?.body ?? ''
      expect(body.length).toBeGreaterThan(0)
      const today = toMMDD(out.month.ym, day)
      for (const d of [...out.month.cautionDays, ...out.month.avoidDays]) {
        if (d >= today) continue
        checkedPast++
        expect(body, `총평이 지난 날 ${d} 을 짚었다 (기준 ${today})`).not.toMatch(koDate(d))
      }
      const tt = pickTryThis(
        {
          bestDay: out.month.bestDay?.date,
          goodDays: out.month.goodDays,
          cautionDays: out.month.cautionDays,
          avoidDays: out.month.avoidDays,
        },
        today
      )
      if (tt.hold) expect(body).toMatch(koDate(tt.hold))
      if (tt.push) expect(body).toMatch(koDate(tt.push))
    }
    expect(checkedPast).toBeGreaterThan(0)
  }, 60000)
})

describe("assembleTiers — 최고의 날이 지나면 총평은 '가장 무게' 를 쓰지 않는다 (F3)", () => {
  const MOST_KO = /가장 (큰 )?무게|무게가 가장/
  const MOST_EN = /most weight|heaviest weight/
  const summaryOf = (out: Awaited<ReturnType<typeof assembleTiers>>) =>
    out.month.narrative.find((n) => n.tag === '이달 총평')

  it('PUSH 가 최고의 날이면 종전 문장, 앞으로 남은 첫 좋은 날로 대체되면 부드러운 문장', async () => {
    let checked = 0
    for (const m of [TARGET_MONTH, 3, 9, 11, 1, 4]) {
      const probe = await assembleTiers(monthInput(m, 1))
      const best = probe.month.bestDay?.date
      if (!best) continue
      const bestD = Number(best.slice(3))
      if (!probe.month.goodDays.some((d) => Number(d.slice(3)) > bestD)) continue

      const [onBest, after] = await Promise.all([
        assembleTiers(monthInput(m, bestD)),
        assembleTiers(monthInput(m, bestD + 1)),
      ])
      const pushAfter = pickTryThis(
        {
          bestDay: after.month.bestDay?.date,
          goodDays: after.month.goodDays,
          cautionDays: after.month.cautionDays,
          avoidDays: after.month.avoidDays,
        },
        toMMDD(after.month.ym, bestD + 1)
      ).push
      expect(pushAfter).not.toBeNull()
      expect(pushAfter).not.toBe(best)

      const a = summaryOf(onBest)!
      expect(a.body).toMatch(MOST_KO)
      expect(a.bodyEn).toMatch(MOST_EN)
      const b = summaryOf(after)!
      const [mm, dd] = pushAfter!.split('-').map(Number)
      expect(b.body).toContain(`${mm}월 ${dd}일`)
      expect(b.body).not.toMatch(MOST_KO)
      expect(b.bodyEn).toContain(`${mm}/${dd}`)
      expect(b.bodyEn ?? '').not.toMatch(MOST_EN)
      checked++
      if (checked >= 2) break
    }
    expect(checked, '최고의 날 뒤에 좋은 날이 남는 달이 fixture 에 있어야 한다').toBeGreaterThan(0)
  }, 120000)
})

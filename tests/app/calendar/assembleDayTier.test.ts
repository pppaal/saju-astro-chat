/**
 * assembleDayTier — 일(日) 티어 단독 어셈블러 테스트.
 *
 * 핵심 계약: 월 그리드에서 고른 *어떤 날짜든* 그 날짜의 day 객체를 만들고,
 * 점수는 월 그리드와 같은 deriveLayeredScores(cells).daily 척도를 쓴다.
 * (예전엔 일 티어가 '오늘'만 빌드돼 월에서 고른 날과 줌인한 화면이 어긋났다.)
 * assembleTiers 의 day 와도 동일 결과여야 한다(같은 코드 경로 회귀 가드).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { deriveLayeredScores } from '@/lib/calendar-engine/derivers/layeredScore'
import { assembleDayTier } from '@/app/calendar/assembleDayTier'
import { assembleTiers } from '@/app/calendar/assembleTiers'
import type { BuildContextInput } from '@/lib/calendar-engine/context/build'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { CalendarCell } from '@/lib/calendar-engine/types'

const TARGET_YEAR = 2024
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
  ;(natal.saju as unknown as Record<string, unknown>).twelveStages = getTwelveStagesForPillars(
    natal.saju.pillars as never
  )
  cells = await buildCalendar(
    natal,
    { start: `${TARGET_YEAR}-01-01`, end: `${TARGET_YEAR}-12-31`, granularity: 'day' },
    {}
  )
}, 60000)

describe('assembleDayTier — 선택한 날짜로 빌드', () => {
  it('builds the requested (non-today) date, not today', async () => {
    const day = await assembleDayTier({
      natal,
      cells,
      lang: 'ko',
      targetDayIso: '2024-06-20',
      focusDayCell: null,
      now: FIXED_NOW,
    })
    expect(day.date).toBe('2024-06-20')
    expect(day.dateKo).toContain('6월 20일')
    // 추이선 마커(today 플래그)도 그 날짜에 붙는다 — DayTier 점 표시 위치.
    const marked = day.monthScores.filter((s) => s.today)
    expect(marked).toHaveLength(1)
    expect(marked[0].day).toBe(20)
  })

  it('scores on the same layered.daily scale as the month grid', async () => {
    const iso = '2024-06-20'
    const day = await assembleDayTier({
      natal,
      cells,
      lang: 'ko',
      targetDayIso: iso,
      focusDayCell: null,
      now: FIXED_NOW,
    })
    const gridScore = deriveLayeredScores(cells).daily.get(iso)?.score
    expect(gridScore).toBeDefined()
    expect(day.score).toBe(Math.round(gridScore!))
  })

  it('matches assembleTiers.day for the same target day (single code path)', async () => {
    const iso = '2024-06-15'
    const [standalone, full] = await Promise.all([
      assembleDayTier({
        natal,
        cells,
        lang: 'ko',
        targetDayIso: iso,
        focusDayCell: null,
        now: FIXED_NOW,
      }),
      assembleTiers({
        natal,
        cells,
        lang: 'ko',
        birthYear: 1990,
        targetYear: TARGET_YEAR,
        targetMonth: 6,
        targetDay: 15,
        targetDayIso: iso,
        sex: '여',
        birthDisplay: '1990-05-21 14:30',
        whoBirthLine: '1990-05-21 14:30',
        place: '대한민국 서울',
        focusDayCell: null,
        now: FIXED_NOW,
      }),
    ])
    // 같은 코드 경로 — 핵심 표시 필드가 완전히 일치해야 한다.
    expect(standalone.date).toBe(full.day.date)
    expect(standalone.score).toBe(full.day.score)
    expect(standalone.oneLine).toBe(full.day.oneLine)
    expect(standalone.iljin).toEqual(full.day.iljin)
    expect(standalone.seed).toBe(full.day.seed)
    expect(standalone.dayTone).toEqual(full.day.dayTone)
    expect(standalone.upcoming).toEqual(full.day.upcoming)
    // '왜' 근거 — 같은 함수·같은 월 셀(계획 B1 #4).
    expect(standalone.reason).toEqual(full.day.reason)
    const cell = full.month.calendar.find((c) => c.ds === iso.slice(5))
    expect(standalone.reason).toEqual(cell?.reason)
  })

  it('월말: nextMonthCells 로 "다가오는 7일"이 월 경계를 넘어 이어진다 (감사 #13)', async () => {
    const juneCells = cells.filter((c) => c.datetime.slice(5, 7) === '06')
    const julyCells = cells.filter((c) => c.datetime.slice(5, 7) === '07')

    // 없으면 종전대로 월말 절단 — 6/28 기준 6/29·6/30 두 날만.
    const without = await assembleDayTier({
      natal,
      cells: juneCells,
      lang: 'ko',
      targetDayIso: '2024-06-28',
      focusDayCell: null,
      now: FIXED_NOW,
    })
    expect(without.upcoming.map((u) => u.date)).toEqual(['2024-06-29', '2024-06-30'])

    const withNext = await assembleDayTier({
      natal,
      cells: juneCells,
      lang: 'ko',
      targetDayIso: '2024-06-28',
      focusDayCell: null,
      now: FIXED_NOW,
      nextMonthCells: julyCells,
    })
    expect(withNext.upcoming).toHaveLength(7)
    expect(withNext.upcoming.map((u) => u.date)).toContain('2024-07-03')
    // 다음 달 날짜 점수는 *그 달 모집단* 기준 — 사용자가 7월을 열었을 때와 동일값.
    const julyLayered = deriveLayeredScores(julyCells)
    const jul3 = withNext.upcoming.find((u) => u.date === '2024-07-03')!
    expect(jul3.score).toBe(Math.round(julyLayered.daily.get('2024-07-03')!.score))
  }, 30000)
})

// ── 엔진 E10 — 월 리드아웃 '왜'(cell.reason) = 일 티어 day.reason ──────────────────
// 프로덕션 /api/calendar/day 경로 그대로: 그 달 cells(evidence 없음, 월 빌드) +
// 그 하루 1일 빌드(evidence 포함, getFocusDayCell 과 같은 범위). 일 근거는 월 빌드
// 셀에서 골라야 월과 같다(엔진 감사 X1 — 1일 빌드로 고르면 절반 가까이 갈렸다).
// 시드 고정 출생 5명 × 날짜 5개. 마지막 출생은 미성년(정화 경로도 같은 문장이어야 함).

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PLACES = [
  { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' },
  { latitude: 35.1796, longitude: 129.0756, timeZone: 'Asia/Seoul' },
  { latitude: 35.6762, longitude: 139.6503, timeZone: 'Asia/Tokyo' },
  { latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
  { latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney' },
] as const

interface ParityCase {
  birth: BuildContextInput
  birthYear: number
  year: number
  month: number
  days: number[]
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function parityCases(): ParityCase[] {
  const rnd = mulberry32(20261125)
  const pick = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1))
  return PLACES.map((place, i) => {
    const birthYear = i === PLACES.length - 1 ? pick(2010, 2014) : pick(1955, 2004)
    const year = pick(2025, 2027)
    const month = pick(1, 12)
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const days = new Set<number>()
    while (days.size < 5) days.add(pick(1, lastDay))
    return {
      birth: {
        birthDate: `${birthYear}-${pad2(pick(1, 12))}-${pad2(pick(1, 28))}`,
        birthTime: `${pad2(pick(0, 23))}:${pad2(pick(0, 59))}`,
        gender: rnd() < 0.5 ? 'female' : 'male',
        ...place,
      },
      birthYear,
      year,
      month,
      days: [...days].sort((a, b) => a - b),
    }
  })
}

describe('E10 — day.reason = 월 셀 reason (시드 출생 5명 × 날짜 5개)', () => {
  const CASES = parityCases()

  it.each(CASES.map((c, i) => [i, c] as const))(
    'birth #%i: 월 리드아웃 근거와 일 티어 근거가 같다',
    async (_i, c) => {
      const natalP = await buildNatalContext(c.birth)
      ;(natalP.saju as unknown as Record<string, unknown>).twelveStages = getTwelveStagesForPillars(
        natalP.saju.pillars as never
      )
      const mm = pad2(c.month)
      const lastDay = new Date(Date.UTC(c.year, c.month, 0)).getUTCDate()
      const monthCells = await buildCalendar(
        natalP,
        {
          start: `${c.year}-${mm}-01T00:00:00.000Z`,
          end: `${c.year}-${mm}-${pad2(lastDay)}T23:59:59.999Z`,
          granularity: 'day',
        },
        { includeEvidence: false }
      )
      let withReason = 0
      for (const d of c.days) {
        const iso = `${c.year}-${mm}-${pad2(d)}`
        const now = new Date(`${iso}T12:00:00Z`)
        const [focusCell] = await buildCalendar(
          natalP,
          { start: `${iso}T00:00:00.000Z`, end: `${iso}T23:59:59.999Z`, granularity: 'day' },
          { includeEvidence: true }
        )
        const [standalone, full] = await Promise.all([
          assembleDayTier({
            natal: natalP,
            cells: monthCells,
            lang: 'ko',
            targetDayIso: iso,
            focusDayCell: focusCell ?? null,
            now,
          }),
          assembleTiers({
            natal: natalP,
            cells: monthCells,
            lang: 'ko',
            birthYear: c.birthYear,
            targetYear: c.year,
            targetMonth: c.month,
            targetDay: d,
            targetDayIso: iso,
            sex: c.birth.gender === 'female' ? '여' : '남',
            birthDisplay: c.birth.birthDate,
            whoBirthLine: c.birth.birthDate,
            place: 'test',
            focusDayCell: focusCell ?? null,
            now,
          }),
        ])
        const cell = full.month.calendar.find((x) => x.d === d)
        expect(cell, iso).toBeDefined()
        expect(standalone.reason, `${iso} standalone vs month cell`).toEqual(cell!.reason)
        expect(full.day.reason, `${iso} assembleTiers.day vs month cell`).toEqual(cell!.reason)
        if (cell!.reason) withReason++
      }
      // 근거가 전부 비어 '같다'가 공허하게 통과하지 않게.
      expect(withReason).toBeGreaterThan(0)
    },
    60000
  )
})

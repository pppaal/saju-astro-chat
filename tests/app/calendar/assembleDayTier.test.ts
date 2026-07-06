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

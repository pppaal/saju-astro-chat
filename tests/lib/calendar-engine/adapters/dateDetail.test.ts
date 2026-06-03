import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { buildInterpretation } from '@/lib/calendar-engine/interpretation/matcher'
import { buildDateDetailResponse } from '@/lib/calendar-engine/adapters/dateDetail'

/**
 * date-detail(오늘 탭) 어댑터 회귀.
 * 95.02.09 06:40 서울 남성 — 2026 은 대운 경계연도(乙亥 23세 → 甲戌 32세, 한국나이).
 */
const P = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

async function build(date: string) {
  const saju = calculateSajuData(P.birthDate, P.birthTime, P.gender, 'solar', P.timeZone)
  const natal = await buildNatalContext(P, { saju })
  const day = await buildCalendar(
    natal,
    { start: `${date}T00:00:00.000Z`, end: `${date}T23:59:59.000Z`, granularity: 'day' },
    { includeEvidence: true }
  )
  const hourly = await buildCalendar(
    natal,
    { start: `${date}T00:00:00.000Z`, end: `${date}T23:59:59.000Z`, granularity: 'hour' },
    { includeEvidence: true }
  )
  const detail = buildDateDetailResponse({
    natal,
    dayCell: day[0],
    hourlyCells: hourly,
    date,
    birthYear: 1995,
  })
  return { natal, detail }
}

describe('date-detail 어댑터', () => {
  it('currentDaeun 은 한국나이 기준 — 경계연도(2026)에 인생 탭과 동일(甲戌)', async () => {
    const { natal, detail } = await build('2026-06-02')
    // 인생 탭(lifetimePivots) 의 2026 대운과 일치해야 한다(만나이로 고르면 乙亥로 어긋남).
    const cells = await buildCalendar(
      natal,
      {
        start: '2026-06-01T00:00:00.000Z',
        end: '2026-06-30T23:59:59.000Z',
        granularity: 'day',
      },
      { includeEvidence: true }
    )
    const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
    const lifeDaeun = (interp.lifetimePivots?.pivots ?? []).find((p) => p.year === 2026 && p.saju)
      ?.saju
    expect(detail.currentDaeun?.label).toBe('甲戌')
    expect(lifeDaeun).toContain('甲戌')
  })

  it('dayTone 은 일진(일주) 십신 × 용신 기준 — ko 한 줄', async () => {
    const { detail } = await build('2026-06-02')
    // 2026-06-02 일진 丁未 = 편관(관성), 火. 辛 용신 화·토 → 火 용신운 → 순탄.
    expect(detail.dayTone).toBeTruthy()
    expect(detail.dayTone).toContain('관성운')
    expect(detail.dayTone).toContain('오늘은')
    // dayAstroTone 은 점성 한 줄(본명 aspect)
    expect(detail.dayAstroTone).toBeTruthy()
  })
})

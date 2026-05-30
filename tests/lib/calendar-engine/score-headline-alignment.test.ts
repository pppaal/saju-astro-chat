import { describe, it, expect } from 'vitest'
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { calculateSajuData } from '@/lib/saju/saju'
import type { CalendarCell } from '@/lib/calendar-engine/types'

/**
 * 회귀 가드 — 두 축 단일출처 점수 contract (v4-twoaxis).
 *
 * 옛 R1/R2/R3(displayScore===score, engineSignals 12달, sajuAxisRaw 시프트)는
 * /api/calendar + DB augment 전제라 폐기. 대신 엔진이 직접 내는 cell의 두 축
 * 모델 정합을 buildCalendar 단위로 검사한다:
 *   - derivedScore(헤드라인) = 두 축(사주/점성) 비보상 결합, 옛 단일 산술평균 아님.
 *   - cell에 sajuAxis/astroAxis/axisAgreement가 함께 노출(단일출처).
 *   - 헤드라인이 50 한 점으로 뭉치지 않고 변별 분포를 가짐(옛 "전부 50" 회귀 차단).
 *   - agreement가 한 값으로만 고정되지 않음.
 */
const SEOUL_MALE_1995 = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

async function buildMonth(): Promise<CalendarCell[]> {
  const saju = calculateSajuData(
    SEOUL_MALE_1995.birthDate,
    SEOUL_MALE_1995.birthTime,
    SEOUL_MALE_1995.gender,
    'solar',
    SEOUL_MALE_1995.timeZone
  )
  const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
  return buildCalendar(
    natal,
    { start: '2026-05-01T00:00:00.000Z', end: '2026-05-31T23:59:59.000Z', granularity: 'day' },
    { includeEvidence: true }
  )
}

describe('calendar two-axis score contract (v4)', () => {
  it('cell exposes derivedScore + sajuAxis/astroAxis/axisAgreement (single source)', async () => {
    const cells = await buildMonth()
    expect(cells.length).toBeGreaterThan(20)
    for (const c of cells) {
      expect(typeof c.derivedScore).toBe('number')
      expect(typeof c.sajuAxis).toBe('number')
      expect(typeof c.astroAxis).toBe('number')
      expect(['aligned', 'mixed', 'opposed']).toContain(c.axisAgreement)
      for (const v of [c.derivedScore, c.sajuAxis!, c.astroAxis!]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })

  it('headline distribution is not collapsed to a single value (변별 가드)', async () => {
    const cells = await buildMonth()
    const scores = cells.map((c) => c.derivedScore)
    const unique = new Set(scores)
    expect(unique.size).toBeGreaterThanOrEqual(5)
    const span = Math.max(...scores) - Math.min(...scores)
    expect(span).toBeGreaterThanOrEqual(15)
    expect(scores.every((s) => s === 50)).toBe(false)
  })

  it('axisAgreement is not frozen to one label across the month', async () => {
    const cells = await buildMonth()
    const labels = new Set(cells.map((c) => c.axisAgreement))
    expect(labels.size).toBeGreaterThanOrEqual(2)
  })
})

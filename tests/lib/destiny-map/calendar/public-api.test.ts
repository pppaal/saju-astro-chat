import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/destiny-map/calendar/date-analysis-orchestrator', async () => {
  const actual = await vi.importActual('@/lib/destiny-map/calendar/date-analysis-orchestrator')
  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return {
    ...actual,
    analyzeDate: vi.fn((date: Date) => ({
      date: toLocalDateString(date),
      grade: 2,
      score: 60,
      categories: ['general'],
      titleKey: 'calendar.good_day',
      descKey: 'calendar.good_desc',
      ganzhi: '甲子',
      crossVerified: true,
      transitSunSign: 'Aries',
      sajuFactorKeys: [],
      astroFactorKeys: [],
      recommendationKeys: [],
      warningKeys: [],
    })),
  }
})

import { calculateMonthlyImportantDates } from '@/lib/destiny-map/destinyCalendar'

describe('calendar public API', () => {
  it('treats calculateMonthlyImportantDates month input as 1-12', () => {
    const result = calculateMonthlyImportantDates(
      2024,
      1,
      {
        dayMaster: '甲',
        dayMasterElement: 'wood',
      },
      {
        sunSign: 'Aries',
        sunElement: 'fire',
      }
    )

    expect(result.month).toBe(1)
    expect(result.dates[0]?.date).toBe('2024-01-01')
    expect(result.dates[result.dates.length - 1]?.date).toBe('2024-01-31')
  })
})

import { describe, expect, it } from 'vitest'

import { calculateDailyGanji } from '@/lib/destiny-map/calendar/utils'
import {
  buildRuntimeIljinTiming,
  deriveRuntimeTimingForDate,
} from '@/lib/destiny-matrix/timingRuntime'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'

const EN_TO_KO: Record<string, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

describe('timingRuntime', () => {
  it('maps daily ganji stem to the runtime iljin element', () => {
    const date = new Date('2026-03-23T12:00:00.000Z')
    const ganji = calculateDailyGanji(date)
    const runtime = buildRuntimeIljinTiming(date, 'Asia/Hong_Kong')

    const stemToElement: Record<string, string> = {
      甲: 'wood',
      乙: 'wood',
      丙: 'fire',
      丁: 'fire',
      戊: 'earth',
      己: 'earth',
      庚: 'metal',
      辛: 'metal',
      壬: 'water',
      癸: 'water',
    }

    expect(runtime.element).toBe(EN_TO_KO[stemToElement[ganji.stem]])
    expect(runtime.date).toBe('2026-03-23')
  })

  it('recomputes iljin per target date in deriveRuntimeTimingForDate', () => {
    const input = {
      profileContext: {
        timezone: 'Asia/Hong_Kong',
      },
      activeTransits: [],
    } as MatrixCalculationInput

    const day1 = deriveRuntimeTimingForDate(input, new Date('2026-03-23T12:00:00.000Z'))
    const day2 = deriveRuntimeTimingForDate(input, new Date('2026-03-24T12:00:00.000Z'))

    expect(day1.currentIljinDate).toBe('2026-03-23')
    expect(day2.currentIljinDate).toBe('2026-03-24')
    expect(`${day1.currentIljinElement}|${day1.currentIljinDate}`).not.toBe(
      `${day2.currentIljinElement}|${day2.currentIljinDate}`
    )
  })

  it('keeps lunarReturn in the same target month for standard runtime consistency', () => {
    const input = {
      profileContext: {
        timezone: 'Asia/Hong_Kong',
      },
      currentDateIso: '2026-03-05',
      advancedAstroSignals: {
        lunarReturn: true,
        solarReturn: true,
      },
      activeTransits: [],
    } as MatrixCalculationInput

    const sameMonth = deriveRuntimeTimingForDate(input, new Date('2026-03-23T12:00:00.000Z'))
    const nextMonth = deriveRuntimeTimingForDate(input, new Date('2026-04-02T12:00:00.000Z'))

    expect(sameMonth.advancedAstroSignals?.lunarReturn).toBe(true)
    expect(nextMonth.advancedAstroSignals?.lunarReturn).toBeUndefined()
  })
})

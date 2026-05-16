import { calculateZodiacalReleasing, getZRPeriodInterpretation } from '@/lib/astrology/foundation/zodiacalReleasing'
import { calculateArabicLots } from '@/lib/astrology/foundation/arabicParts'
import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor } from '../types'

/**
 * Zodiacal Releasing (조디악 릴리싱) 추출기 — 헬레니즘 인생 챕터.
 *
 * Lot of Spirit의 sign에서 시작해 sign 순서대로 챕터 진행.
 * 챕터 길이 = 그 sign의 ruler가 가진 "년수" (Sun=19, Moon=25, Mercury=20, Venus=8, Mars=15, Jupiter=12, Saturn=27).
 *
 * 활성 윈도우 = 챕터 시작년~종료년 (8~27년).
 * polarity는 ruler 행성의 길흉 + 대운(decadal) 정렬과 cross check.
 */

const RULER_POLARITY: Record<string, -1 | 0 | 1> = {
  Jupiter: 1, Venus: 1, Sun: 0, Moon: 0, Mercury: 0, Mars: -1, Saturn: -1,
}

const astroZRExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'zodiacal-releasing',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const isDayChart = natal.astro.sect === 'day'
    const lots = calculateArabicLots(natal.astro.chart, isDayChart)
    const spirit = lots.find((l) => l.name === 'Spirit')
    if (!spirit) return []

    const periods = calculateZodiacalReleasing(spirit.sign as ZodiacKo, 90)
    const birthYear = natal.input.year
    const rangeStartYear = new Date(range.start).getUTCFullYear()
    const rangeEndYear = new Date(range.end).getUTCFullYear()

    const signals: ActiveSignal[] = []
    for (const period of periods) {
      const startYear = birthYear + period.startYear
      const endYear = birthYear + period.endYear
      // range와 겹치는지
      if (endYear < rangeStartYear || startYear > rangeEndYear) continue

      const startIso = new Date(Date.UTC(startYear, 0, 1)).toISOString()
      const endIso = new Date(Date.UTC(endYear, 0, 1, 0, -1)).toISOString()
      const peakIso = new Date(Date.UTC(Math.floor((startYear + endYear) / 2), 0, 1)).toISOString()

      const polarity = (RULER_POLARITY[period.ruler] ?? 0) * 2 as -2 | 0 | 2

      signals.push({
        id: `astro.zr.${period.index}.${period.sign}`,
        source: 'astro',
        kind: 'zodiacal-releasing',
        name: `ZR L1: ${period.sign} (${period.ruler}, ${period.durationYears}년)`,
        korean: `ZR 챕터 — ${period.sign} (지배: ${period.ruler})`,
        themes: [],   // tagger가 ruler planet으로 채움
        polarity,
        layer: 'decadal',
        active: { start: startIso, peak: peakIso, end: endIso },
        weight: 0.9,
        evidence: {
          module: 'astro-zr',
          planets: [period.ruler],
          detail: {
            sign: period.sign,
            ruler: period.ruler,
            chapterIndex: period.index,
            durationYears: period.durationYears,
            spiritSign: spirit.sign,
            interpretation: getZRPeriodInterpretation(period),
          },
        },
      })
    }

    return signals
  },
}

export default astroZRExtractor

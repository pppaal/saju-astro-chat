import {
  annotateZRMarkers,
  calculateZodiacalReleasing,
  calculateZRSubPeriods,
  calculateZRSubPeriodsL3,
  getZRPeriodInterpretation,
  type ZRPeriod,
  type ZRStartLot,
  type ZRSubPeriod,
} from '@/lib/astrology/foundation/zodiacalReleasing'
import { calculateArabicLots } from '@/lib/astrology/foundation/arabicParts'
import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, Polarity, SignalExtractor } from '../types'

/**
 * Zodiacal Releasing (조디악 릴리싱) 추출기 — 헬레니즘 인생 챕터.
 *
 * 본 추출기는 두 종류 (Spirit / Fortune) 의 ZR 흐름을 한꺼번에 산출:
 *  - Spirit ZR: Lot of Spirit 의 sign 에서 시작 — 영혼·의도·진로
 *  - Fortune ZR: Lot of Fortune 의 sign 에서 시작 — 운명·물질·몸
 *
 * 각 ZR 마다 L1 (years) / L2 (months) / L3 (days) 신호 + Peak / Loosing-of-Bond 이벤트.
 * L4 (시간 단위) 는 신호로 풀지 않고 계산만 지원 (캘린더 일자 단위라 일반적으로 L3 이 일자별 신호).
 */

const RULER_POLARITY: Record<string, -1 | 0 | 1> = {
  Jupiter: 1,
  Venus: 1,
  Sun: 0,
  Moon: 0,
  Mercury: 0,
  Mars: -1,
  Saturn: -1,
}

const ZODIAC_ORDER: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

function offsetBetweenSigns(from: ZodiacKo, to: ZodiacKo): number {
  return ((ZODIAC_ORDER.indexOf(to) - ZODIAC_ORDER.indexOf(from) + 12) % 12) + 1
}

interface YearWindow {
  start: string
  end: string
  peak: string
}

function birthAgeToDate(birthYear: number, ageYears: number): Date {
  const ms = Date.UTC(birthYear, 0, 1) + ageYears * 365.25 * 86400 * 1000
  return new Date(ms)
}

function makeWindow(birthYear: number, startAge: number, endAge: number): YearWindow {
  const start = birthAgeToDate(birthYear, startAge).toISOString()
  const end = birthAgeToDate(birthYear, endAge).toISOString()
  const peak = birthAgeToDate(birthYear, (startAge + endAge) / 2).toISOString()
  return { start, end, peak }
}

function withinRange(win: YearWindow, rangeStart: string, rangeEnd: string): boolean {
  const winStart = new Date(win.start).getTime()
  const winEnd = new Date(win.end).getTime()
  const rStart = new Date(rangeStart).getTime()
  const rEnd = new Date(rangeEnd).getTime()
  return !(winEnd < rStart || winStart > rEnd)
}

function clampPolarity(value: number): Polarity {
  if (value > 3) return 3
  if (value < -3) return -3
  return Math.round(value) as Polarity
}

function emitL1Signals(args: {
  lot: ZRStartLot
  startSign: ZodiacKo
  birthYear: number
  range: { start: string; end: string }
}): { signals: ActiveSignal[]; periods: ZRPeriod[] } {
  const { lot, startSign, birthYear, range } = args
  const periods = calculateZodiacalReleasing(startSign, 90)
  const annotated = annotateZRMarkers(startSign, periods)
  const signals: ActiveSignal[] = []
  const layerL1 = 'decadal' as const
  const baseKey = lot.toLowerCase()
  const lotKo = lot === 'Spirit' ? '영혼' : '운명·몸'

  for (const period of annotated) {
    const win = makeWindow(birthYear, period.startYear, period.endYear)
    if (!withinRange(win, range.start, range.end)) continue

    const polarity = clampPolarity((RULER_POLARITY[period.ruler] ?? 0) * 2)
    signals.push({
      id: `astro.zr.${baseKey}.l1.${period.index}.${period.sign}`,
      source: 'astro',
      kind: 'zodiacal-releasing',
      name: `ZR ${lot} L1: ${period.sign} (${period.ruler}, ${period.durationYears}년)`,
      korean: `${lot === 'Spirit' ? '영혼' : '운명'} ZR 챕터 — ${period.sign} (${period.ruler}, ${period.durationYears}년)`,
      english: `${lot} ZR chapter — ${period.sign} (${period.ruler}, ${period.durationYears} years)`,
      polarity,
      layer: layerL1,
      active: win,
      weight: 0.9,
      evidence: {
        module: 'astro-zr',
        planets: [period.ruler],
        detail: {
          lot,
          lotKo,
          level: 1,
          sign: period.sign,
          ruler: period.ruler,
          chapterIndex: period.index,
          durationYears: period.durationYears,
          startSign,
          offsetFromStart: period.offsetFromStart,
          isPeak: period.isPeak,
          isLoosingOfTheBond: period.isLoosingOfTheBond,
          translationKey: lot === 'Spirit' ? 'zrSpiritL1' : 'zrFortuneL1',
          interpretation: getZRPeriodInterpretation(period),
        },
      },
    })

    // L1 자체가 startSign 기준 angular 면 Peak 이벤트 발화 — L1 윈도우 전체에 강한 신호.
    if (period.isPeak) {
      signals.push({
        id: `astro.zr.${baseKey}.l1.peak.${period.index}.${period.sign}`,
        source: 'astro',
        kind: 'zodiacal-releasing',
        name: `ZR ${lot} Peak: ${period.sign}`,
        korean: `${lot === 'Spirit' ? '영혼' : '운명'} ZR Peak — ${period.sign}`,
        english: `${lot} ZR Peak — ${period.sign}: a high-visibility, career-defining stretch`,
        polarity: clampPolarity(polarity + 1),
        layer: layerL1,
        active: win,
        weight: 0.85,
        evidence: {
          module: 'astro-zr',
          planets: [period.ruler],
          detail: {
            lot,
            lotKo,
            level: 1,
            event: 'peak',
            sign: period.sign,
            ruler: period.ruler,
            offsetFromStart: period.offsetFromStart,
            translationKey: 'zrPeak',
          },
        },
      })
    }

    // Loosing of the bond — 시작 sign 의 7번째 (opposition) — 큰 전환점.
    if (period.isLoosingOfTheBond) {
      signals.push({
        id: `astro.zr.${baseKey}.l1.loosing.${period.index}.${period.sign}`,
        source: 'astro',
        kind: 'zodiacal-releasing',
        name: `ZR ${lot} Loosing-of-the-Bond: ${period.sign}`,
        korean: `${lot === 'Spirit' ? '영혼' : '운명'} ZR 결 풀림 — ${period.sign}`,
        english: `${lot} ZR Loosing-of-the-Bond — ${period.sign}: a major turning point and release`,
        // 큰 폴라리티 (전환). ruler 길흉 위에 절댓값 1 더 — 부정/긍정 어느 쪽이든 진폭이 큼.
        polarity: clampPolarity(polarity === 0 ? -2 : polarity + Math.sign(polarity)),
        layer: layerL1,
        active: win,
        weight: 0.95,
        evidence: {
          module: 'astro-zr',
          planets: [period.ruler],
          detail: {
            lot,
            lotKo,
            level: 1,
            event: 'loosing-of-bond',
            sign: period.sign,
            ruler: period.ruler,
            offsetFromStart: period.offsetFromStart,
            translationKey: 'zrLoosingOfBond',
          },
        },
      })
    }
  }

  return { signals, periods }
}

function emitSubSignals(args: {
  lot: ZRStartLot
  level: 2 | 3
  parent: ZRPeriod | ZRSubPeriod
  subPeriods: ZRSubPeriod[]
  birthYear: number
  range: { start: string; end: string }
}): ActiveSignal[] {
  const { lot, level, parent, subPeriods, birthYear, range } = args
  const signals: ActiveSignal[] = []
  const baseKey = lot.toLowerCase()
  const layer = level === 2 ? 'monthly' : 'daily'
  const lotKo = lot === 'Spirit' ? '영혼' : '운명·몸'

  for (const sub of subPeriods) {
    const win = makeWindow(birthYear, sub.startYear, sub.endYear)
    if (!withinRange(win, range.start, range.end)) continue

    const polarity = clampPolarity(RULER_POLARITY[sub.ruler] ?? 0)
    const weight = level === 2 ? 0.6 : 0.4
    signals.push({
      id: `astro.zr.${baseKey}.l${level}.${parent.sign}.${sub.index}.${sub.sign}`,
      source: 'astro',
      kind: 'zodiacal-releasing',
      name: `ZR ${lot} L${level}: ${sub.sign} (${sub.ruler})`,
      korean: `${lot === 'Spirit' ? '영혼' : '운명'} ZR L${level} — ${sub.sign} (${sub.ruler})`,
      english: `${lot} ZR L${level} sub-period — ${sub.sign} (${sub.ruler})`,
      polarity,
      layer,
      active: win,
      weight,
      evidence: {
        module: 'astro-zr',
        planets: [sub.ruler],
        detail: {
          lot,
          lotKo,
          level,
          sign: sub.sign,
          ruler: sub.ruler,
          parentSign: sub.parentSign,
          offsetFromParent: offsetBetweenSigns(sub.parentSign, sub.sign),
          isPeak: sub.isPeak,
          isLoosingOfTheBond: sub.isLoosingOfTheBond,
          translationKey: lot === 'Spirit' ? 'zrSpiritL1' : 'zrFortuneL1',
        },
      },
    })

    // sub-period peak (parent sign 기준 angular)
    if (sub.isPeak) {
      signals.push({
        id: `astro.zr.${baseKey}.l${level}.peak.${parent.sign}.${sub.index}.${sub.sign}`,
        source: 'astro',
        kind: 'zodiacal-releasing',
        name: `ZR ${lot} L${level} Peak: ${sub.sign}`,
        korean: `${lot === 'Spirit' ? '영혼' : '운명'} ZR L${level} Peak — ${sub.sign}`,
        english: `${lot} ZR L${level} Peak — ${sub.sign}: a high point within the sub-period`,
        polarity: clampPolarity(polarity + 1),
        layer,
        active: win,
        weight: level === 2 ? 0.7 : 0.5,
        evidence: {
          module: 'astro-zr',
          planets: [sub.ruler],
          detail: {
            lot,
            lotKo,
            level,
            event: 'peak',
            sign: sub.sign,
            ruler: sub.ruler,
            parentSign: sub.parentSign,
            translationKey: 'zrPeak',
          },
        },
      })
    }

    if (sub.isLoosingOfTheBond) {
      signals.push({
        id: `astro.zr.${baseKey}.l${level}.loosing.${parent.sign}.${sub.index}.${sub.sign}`,
        source: 'astro',
        kind: 'zodiacal-releasing',
        name: `ZR ${lot} L${level} Loosing-of-the-Bond: ${sub.sign}`,
        korean: `${lot === 'Spirit' ? '영혼' : '운명'} ZR L${level} 결 풀림 — ${sub.sign}`,
        english: `${lot} ZR L${level} Loosing-of-the-Bond — ${sub.sign}: a turning point within the sub-period`,
        polarity: clampPolarity(polarity === 0 ? -2 : polarity + Math.sign(polarity)),
        layer,
        active: win,
        weight: level === 2 ? 0.8 : 0.6,
        evidence: {
          module: 'astro-zr',
          planets: [sub.ruler],
          detail: {
            lot,
            lotKo,
            level,
            event: 'loosing-of-bond',
            sign: sub.sign,
            ruler: sub.ruler,
            parentSign: sub.parentSign,
            translationKey: 'zrLoosingOfBond',
          },
        },
      })
    }
  }
  return signals
}

const astroZRExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'zodiacal-releasing',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const isDayChart = natal.astro.sect === 'day'
    const lots = calculateArabicLots(natal.astro.chart, isDayChart)
    const spirit = lots.find((l) => l.name === 'Spirit')
    const fortune = lots.find((l) => l.name === 'Fortune')

    const birthYear = natal.input.year
    const all: ActiveSignal[] = []

    for (const lot of [
      spirit ? { lotName: 'Spirit' as ZRStartLot, sign: spirit.sign as ZodiacKo } : undefined,
      fortune ? { lotName: 'Fortune' as ZRStartLot, sign: fortune.sign as ZodiacKo } : undefined,
    ]) {
      if (!lot) continue

      const { signals: l1signals, periods } = emitL1Signals({
        lot: lot.lotName,
        startSign: lot.sign,
        birthYear,
        range,
      })
      all.push(...l1signals)

      // L2/L3: range 와 겹치는 L1 만 펼쳐 비용 절약.
      const rangeStartAge =
        (new Date(range.start).getTime() - Date.UTC(birthYear, 0, 1)) / (365.25 * 86400 * 1000)
      const rangeEndAge =
        (new Date(range.end).getTime() - Date.UTC(birthYear, 0, 1)) / (365.25 * 86400 * 1000)

      for (const parentL1 of periods) {
        if (parentL1.endYear < rangeStartAge || parentL1.startYear > rangeEndAge) continue
        const l2List = calculateZRSubPeriods(parentL1)
        all.push(
          ...emitSubSignals({
            lot: lot.lotName,
            level: 2,
            parent: parentL1,
            subPeriods: l2List,
            birthYear,
            range,
          })
        )

        for (const parentL2 of l2List) {
          if (parentL2.endYear < rangeStartAge || parentL2.startYear > rangeEndAge) continue
          const l3List = calculateZRSubPeriodsL3(parentL2)
          all.push(
            ...emitSubSignals({
              lot: lot.lotName,
              level: 3,
              parent: parentL2,
              subPeriods: l3List,
              birthYear,
              range,
            })
          )
        }
      }
    }

    return all
  },
}

export default astroZRExtractor

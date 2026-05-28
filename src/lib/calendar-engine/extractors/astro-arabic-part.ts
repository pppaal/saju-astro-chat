import { calculateArabicLots } from '@/lib/astrology/foundation/arabicParts'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { inferAspectPolarity } from '../themes/tagger'
import { getCachedTransitChart } from '../ephe-cache'
import { shortestAngle } from '@/lib/astrology/foundation/utils'

/**
 * Arabic Parts (아라빅 파츠) 활성 추출기.
 *
 * 본명 차트의 7대 Lot (Fortune, Spirit, Eros, Necessity, Courage, Victory, Nemesis)을 계산하고,
 * 매일 트랜짓 행성이 이 Lot에 컨정션 (orb ≤ 2°)할 때 신호 생성.
 *
 * 활성 윈도우: 컨정션 ±3일.
 * polarity: Lot의 본질 + 트랜짓 행성의 길흉으로 결정.
 */

const LOT_POLARITY_HINT: Record<string, -1 | 0 | 1> = {
  Fortune:   1,
  Spirit:    1,
  Eros:      1,
  Victory:   1,
  Courage:   0,
  Necessity: -1,
  Nemesis:   -1,
}

const ORB_DEG = 2.0

const astroArabicPartExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'arabic-part',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const isDayChart = natal.astro.sect === 'day'
    const natalLots = calculateArabicLots(natal.astro.chart, isDayChart)

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      let transitChart: Chart
      try {
        transitChart = await getCachedTransitChart({
          iso: noonIso,
          latitude: natal.astro.location.latitude,
          longitude: natal.astro.location.longitude,
          timeZone: natal.astro.location.timeZone,
          inMemoryCache: cache,
        })
      } catch {
        continue
      }

      const dayIso = new Date(t).toISOString().slice(0, 10)
      for (const lot of natalLots) {
        for (const planet of transitChart.planets) {
          const diff = shortestAngle(planet.longitude, lot.longitude)
          if (diff > ORB_DEG) continue

          const lotHint = LOT_POLARITY_HINT[lot.name] ?? 0
          const planetPol = inferAspectPolarity('conjunction', planet.name, planet.name) // self-conjunction → planet sign
          const polarity = clampPolarity(lotHint * 2 + planetPol)

          signals.push({
            id: `astro.arabic-part.${lot.name}.${planet.name}.${dayIso}`,
            source: 'astro',
            kind: 'arabic-part',
            name: `${planet.name} ☌ Lot of ${lot.name}`,
            korean: `${planet.name} 컨정션 ${lot.name}점`,
            themes: [],   // tagger가 행성으로 채움
            polarity,
            layer: 'daily',
            active: {
              start: `${dayIso}T00:00:00.000Z`,
              peak: `${dayIso}T12:00:00.000Z`,
              end: `${dayIso}T23:59:59.999Z`,
            },
            weight: 0.65 * Math.max(0.4, 1 - diff / ORB_DEG),
            evidence: {
              module: 'astro-arabic-part',
              orbDegrees: diff,
              planets: [planet.name],
              aspectType: 'conjunction',
              detail: {
                lotName: lot.name,
                lotSign: lot.sign,
                lotFormula: lot.formula,
              },
            },
          })
        }
      }
    }

    return signals
  },
}

function clampPolarity(n: number): Polarity {
  if (n >= 3) return 3
  if (n <= -3) return -3
  return Math.round(n) as Polarity
}

export default astroArabicPartExtractor

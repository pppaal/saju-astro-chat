import { analyzeElection } from '@/lib/astrology/foundation/electional'
import { calculateTransitChart } from '@/lib/astrology/foundation/transit'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ElectionalEventType } from '@/lib/astrology/foundation/electional'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'

/**
 * Electional (택일) 추출기.
 *
 * 점성술의 "이 일을 시작하기 좋은 날"을 매일 평가.
 * 37개 이벤트 중 핵심 6개만 매일 점수화 → 점수 ≥ 70인 날만 신호 생성 (signal 폭발 방지).
 *
 * 활성 윈도우: 그 1일.
 */

const KEY_EVENTS: ElectionalEventType[] = [
  'marriage',
  'business_launch',
  'travel_long',
  'medical_surgery',
  'real_estate',
  'contract_signing',
]

const EVENT_LABELS: Record<string, string> = {
  marriage:          '결혼',
  business_launch:   '사업 시작',
  travel_long:       '장거리 여행',
  medical_surgery:   '수술',
  real_estate:       '부동산 거래',
  contract_signing:  '계약 체결',
}

const SCORE_THRESHOLD = 70

const astroElectionalExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'electional',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      const cacheKey = `transit-chart:${noonIso}:${natal.astro.location.latitude}:${natal.astro.location.longitude}`
      let chart = cache.get<Chart>(cacheKey)
      if (!chart) {
        try {
          chart = await calculateTransitChart({
            iso: noonIso,
            latitude: natal.astro.location.latitude,
            longitude: natal.astro.location.longitude,
            timeZone: natal.astro.location.timeZone,
          })
          cache.set(cacheKey, chart)
        } catch {
          continue
        }
      }

      const dayIso = new Date(t).toISOString().slice(0, 10)
      for (const event of KEY_EVENTS) {
        const analysis = analyzeElection(chart, event, new Date(t))
        if (analysis.totalScore < SCORE_THRESHOLD) continue

        // 점수를 polarity로 매핑 (70~100 → +1~+3)
        const polarity: Polarity = analysis.totalScore >= 90 ? 3
          : analysis.totalScore >= 80 ? 2
          : 1

        signals.push({
          id: `astro.electional.${event}.${dayIso}`,
          source: 'astro',
          kind: 'electional',
          name: `택일: ${EVENT_LABELS[event] ?? event} (${analysis.totalScore}점)`,
          korean: `${EVENT_LABELS[event] ?? event} 택일 좋음 — ${analysis.totalScore}점`,
          themes: themesForEvent(event),
          polarity,
          layer: 'daily',
          active: {
            start: `${dayIso}T00:00:00.000Z`,
            peak: `${dayIso}T12:00:00.000Z`,
            end: `${dayIso}T23:59:59.999Z`,
          },
          weight: 0.55 + (analysis.totalScore - 70) / 100,
          evidence: {
            module: 'astro-electional',
            detail: {
              eventType: event,
              totalScore: analysis.totalScore,
              recommendation: analysis.recommendation,
              moonPhase: analysis.moonPhase,
              moonSign: analysis.moonSign,
            },
          },
        })
      }
    }

    return signals
  },
}

function themesForEvent(event: ElectionalEventType): import('@/lib/astrology/themes/types').AstroThemeKey[] {
  switch (event) {
    case 'marriage':         return ['love', 'family']
    case 'business_launch':  return ['business', 'money']
    case 'travel_long':      return ['travel']
    case 'medical_surgery':  return ['health', 'crisis']
    case 'real_estate':      return ['money', 'family']
    case 'contract_signing': return ['legal', 'business']
    default:                 return []
  }
}

export default astroElectionalExtractor

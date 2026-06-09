import { analyzeElection } from '@/lib/astrology/foundation/electional'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ElectionalEventType } from '@/lib/astrology/foundation/electional'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { getCachedTransitChart } from '../ephe-cache'

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
  'business_start',
  'long_journey',
  'surgery',
  'buying_property',
  'signing_contracts',
]

const EVENT_LABELS: Record<string, string> = {
  marriage: '결혼',
  business_start: '사업 시작',
  long_journey: '장거리 여행',
  surgery: '수술',
  buying_property: '부동산 매입',
  signing_contracts: '계약 체결',
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
      let chart: Chart
      try {
        chart = await getCachedTransitChart({
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
      for (const event of KEY_EVENTS) {
        const analysis = analyzeElection(chart, event, new Date(t))
        const score = analysis.score.total
        if (score < SCORE_THRESHOLD) continue

        // 점수를 polarity로 매핑 (70~100 → +1~+3)
        const polarity: Polarity = score >= 90 ? 3 : score >= 80 ? 2 : 1

        signals.push({
          id: `astro.electional.${event}.${dayIso}`,
          source: 'astro',
          kind: 'electional',
          name: `택일: ${EVENT_LABELS[event] ?? event} (${score}점)`,
          korean: `${EVENT_LABELS[event] ?? event} 택일 좋음 — ${score}점`,
          polarity,
          layer: 'daily',
          active: {
            start: `${dayIso}T00:00:00.000Z`,
            peak: `${dayIso}T12:00:00.000Z`,
            end: `${dayIso}T23:59:59.999Z`,
          },
          weight: 0.55 + (score - 70) / 100,
          evidence: {
            module: 'astro-electional',
            detail: {
              eventType: event,
              totalScore: score,
              recommendation: analysis.recommendations?.[0] ?? '',
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

export default astroElectionalExtractor

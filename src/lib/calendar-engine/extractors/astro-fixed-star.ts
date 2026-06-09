import { findFixedStarConjunctions } from '@/lib/astrology/foundation/fixedStars'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { getCachedTransitChart } from '../ephe-cache'

/**
 * 항성 (Fixed Stars) 컨정션 추출기.
 *
 * 매일 트랜짓 행성과 50+ 주요 항성의 컨정션 검사 (orb ≤ 1°).
 * 항성은 본질적으로 길흉 강도 큰 신호 — Algol(흉) / Regulus(길) / Spica(길) 등.
 *
 * 활성 윈도우: 컨정션 당일 (orb 1° 이내).
 */

// 자주 등장하는 항성의 길흉 분류 (전통)
const STAR_POLARITY: Record<string, -2 | 0 | 2> = {
  Regulus: 2, // Royal — 명예
  Spica: 2, // 보호·재능
  Aldebaran: 2, // Royal — 성공
  Antares: 2, // Royal — 강한 의지
  Fomalhaut: 2, // Royal — 영성
  Sirius: 2, // 성공·번영
  Vega: 2, // 예술·매력
  Algol: -2, // 위험·격동
  Alcyone: -2, // 슬픔·울음
  Arcturus: 2, // 보호·번영
  Procyon: 0, // 변화 (양면)
  Betelgeuse: 0, // 명예·역경 혼재
}

const ORB_DEG = 1.0

const astroFixedStarExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'fixed-star',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const year = date.getUTCFullYear()
      const noonIso = date.toISOString().slice(0, 10) + 'T12:00:00'
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

      const conjunctions = findFixedStarConjunctions(transitChart, year, ORB_DEG)
      const dayIso = date.toISOString().slice(0, 10)

      for (const conj of conjunctions) {
        const polarity: Polarity = STAR_POLARITY[conj.star.name] ?? 0
        signals.push({
          id: `astro.fixed-star.${conj.star.name}.${conj.planet}.${dayIso}`,
          source: 'astro',
          kind: 'fixed-star',
          name: `${conj.planet} ☌ ${conj.star.name_ko ?? conj.star.name}`,
          korean: conj.star.interpretation
            ? `${conj.description} — ${conj.star.interpretation}`
            : conj.description,
          english: `${conj.planet} conjunct the fixed star ${conj.star.name} — its symbolism flares briefly (orb ${conj.orb.toFixed(2)}°)`,
          polarity,
          layer: 'daily',
          active: {
            start: `${dayIso}T00:00:00.000Z`,
            peak: `${dayIso}T12:00:00.000Z`,
            end: `${dayIso}T23:59:59.999Z`,
          },
          weight: 0.7 * Math.max(0.4, 1 - conj.orb / ORB_DEG),
          evidence: {
            module: 'astro-fixed-star',
            orbDegrees: conj.orb,
            planets: [conj.planet],
            aspectType: 'conjunction',
            detail: {
              starName: conj.star.name,
              starKorean: conj.star.name_ko,
              starMagnitude: conj.star.magnitude,
            },
          },
        })
      }
    }

    return signals
  },
}

export default astroFixedStarExtractor

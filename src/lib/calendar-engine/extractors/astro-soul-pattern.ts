import { calculateDraconicChart, type DraconicChart } from '@/lib/astrology/foundation/draconic'
import { calculateHarmonicChart, type HarmonicChart } from '@/lib/astrology/foundation/harmonics'
import { shortestAngle } from '@/lib/astrology/foundation/utils'
import type { Chart, PlanetBase } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { inferAspectPolarity } from '../aspect-polarity'
import { getCachedTransitChart } from '../ephe-cache'

/**
 * 영혼·패턴 결 추출기 (Draconic + Harmonics).
 *
 * 본명 차트로부터:
 *   - Draconic chart 1회 계산 (cache) — North Node 0° 양자리 기준 영혼 결
 *   - Harmonic 4/5/7/9 차트 각 1회 계산 (cache)
 *       · 4th: 노력 결 (square 기반)
 *       · 5th: 재능 결 (quintile 기반)
 *       · 7th: 영감 결 (septile 기반)
 *       · 9th: 영성 결 (nonile 기반)
 *
 * 매일 정오 트랜짓 차트를 잡고, 트랜짓 행성이 이 본명 결 좌표와 컨정션
 * (orb ≤ 1.5°)할 때 신호 발생.
 *
 * polarity:
 *   - Draconic 컨택: 행성 베네픽/말레픽에 따라 ±1~2 (영혼 차원 활성)
 *   - Harmonic 컨택: 본질 결 톤(4→노력 -, 5→재능 +, 7→영감 +, 9→영성 +)
 *
 * layer: 'monthly' — 트랜짓 inner는 빠르지만 본명 결 자체가 한 결 두꺼움.
 * weight: 0.45 (기본 — orb 좁을수록 가중).
 *
 * 신규 kind: 'draconic', 'harmonic'.
 */

const ORB_DEG = 1.5
const BASE_WEIGHT = 0.45
const DRACONIC_POLARITY_FLOOR: Polarity = 1 // 영혼 결 컨택의 최소 폴라리티
const HARMONICS = [4, 5, 7, 9] as const

type HarmonicN = (typeof HARMONICS)[number]

/** 하모닉 별 결 톤 — natural polarity bias.
 *  4th(노력·도전): 살짝 음(-) — 일·도전이 표면화될 때 압력이 함께.
 *  5th(재능·창의): 양(+).
 *  7th(영감·신비): 양(+).
 *  9th(영성·완성): 양(+).
 */
const HARMONIC_POLARITY_BIAS: Record<HarmonicN, -1 | 0 | 1> = {
  4: -1,
  5: 1,
  7: 1,
  9: 1,
}

/** 본명 결 결의 한국어 라벨 */
const HARMONIC_LABEL: Record<HarmonicN, string> = {
  4: '노력',
  5: '재능',
  7: '영감',
  9: '영성',
}

/** 신호 본명 포인트로 사용할 행성/포인트 후보 */
const RELEVANT_NATAL_NAMES = new Set([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Ascendant',
  'MC',
])

/** 본명 결 차트에서 신호 후보로 쓸 포인트 리스트 추출 */
function pickNatalPoints(chart: Chart | DraconicChart | HarmonicChart): PlanetBase[] {
  const all: PlanetBase[] = [...chart.planets, chart.ascendant, chart.mc]
  return all.filter((p) => RELEVANT_NATAL_NAMES.has(p.name))
}

/** Polarity clamp to typed range */
function clampPolarity(n: number): Polarity {
  if (n >= 3) return 3
  if (n <= -3) return -3
  return Math.round(n) as Polarity
}

const astroSoulPatternExtractor: SignalExtractor = {
  source: 'astro',
  kind: ['draconic', 'harmonic'],
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const natalChart = natal.astro.chart

    // 본명 결 차트 1회 계산 (요청 내 캐시)
    const natalKey = `soul-pattern:${natal.input.year}-${natal.input.month}-${natal.input.date}:${natal.input.hour}:${natal.input.minute}`

    let draconic = cache.get<DraconicChart>(`${natalKey}:draconic`)
    if (!draconic) {
      try {
        draconic = calculateDraconicChart(natalChart)
        cache.set(`${natalKey}:draconic`, draconic)
      } catch {
        draconic = null as unknown as DraconicChart
      }
    }

    const harmonicCharts = new Map<HarmonicN, HarmonicChart>()
    for (const h of HARMONICS) {
      const key = `${natalKey}:harmonic:${h}`
      let hc = cache.get<HarmonicChart>(key)
      if (!hc) {
        try {
          hc = calculateHarmonicChart(natalChart, h)
          cache.set(key, hc)
        } catch {
          continue
        }
      }
      harmonicCharts.set(h, hc)
    }

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    const draconicPoints = draconic ? pickNatalPoints(draconic) : []
    const harmonicPoints = new Map<HarmonicN, PlanetBase[]>()
    for (const [h, hc] of harmonicCharts) {
      harmonicPoints.set(h, pickNatalPoints(hc))
    }

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const dayIso = date.toISOString().slice(0, 10)
      const noonIso = `${dayIso}T12:00:00`

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

      // 트랜짓 행성: 실제 움직이는 결을 보기 위해 본질 행성만 검사
      const transitPlanets = transitChart.planets.filter((p) => RELEVANT_NATAL_NAMES.has(p.name))

      const active = {
        start: `${dayIso}T00:00:00.000Z`,
        peak: `${dayIso}T12:00:00.000Z`,
        end: `${dayIso}T23:59:59.999Z`,
      }

      // ── 1) Draconic 컨택 ─────────────────────────────────────────────
      for (const tp of transitPlanets) {
        for (const dp of draconicPoints) {
          const diff = shortestAngle(tp.longitude, dp.longitude)
          if (diff > ORB_DEG) continue

          const benefMal = inferAspectPolarity('conjunction', tp.name, dp.name)
          // 영혼 결은 최소 +1, 베네픽 컨택은 +2, 말레픽 컨택은 0
          const polarity: Polarity = clampPolarity(Math.max(benefMal, DRACONIC_POLARITY_FLOOR))

          signals.push({
            id: `astro.draconic.${tp.name}.${dp.name}.${dayIso}`,
            source: 'astro',
            kind: 'draconic',
            name: `${tp.name} ☌ Draconic ${dp.name}`,
            korean: `트랜짓 ${tp.name}가 영혼 결의 ${dp.name}에 닿음`,
            polarity,
            layer: 'monthly',
            active,
            weight: BASE_WEIGHT * Math.max(0.4, 1 - diff / ORB_DEG),
            evidence: {
              module: 'astro-soul-pattern',
              planets: [tp.name, dp.name],
              aspectType: 'conjunction',
              orbDegrees: diff,
              detail: {
                layer: 'draconic',
                draconicPoint: dp.name,
                draconicLongitude: dp.longitude,
                transitLongitude: tp.longitude,
              },
            },
          })
        }
      }

      // ── 2) Harmonic 컨택 ─────────────────────────────────────────────
      for (const [h, hpoints] of harmonicPoints) {
        for (const tp of transitPlanets) {
          for (const hp of hpoints) {
            const diff = shortestAngle(tp.longitude, hp.longitude)
            if (diff > ORB_DEG) continue

            const benefMal = inferAspectPolarity('conjunction', tp.name, hp.name)
            const bias = HARMONIC_POLARITY_BIAS[h]
            // 하모닉 본질 + 트랜짓 행성 베네픽/말레픽 합산 (clamp)
            const polarity: Polarity = clampPolarity(bias + benefMal)

            signals.push({
              id: `astro.harmonic.H${h}.${tp.name}.${hp.name}.${dayIso}`,
              source: 'astro',
              kind: 'harmonic',
              name: `${tp.name} ☌ H${h} ${hp.name}`,
              korean: `트랜짓 ${tp.name}가 ${HARMONIC_LABEL[h]} 결(H${h})의 ${hp.name} 패턴에 닿음`,
              polarity,
              layer: 'monthly',
              active,
              weight: BASE_WEIGHT * Math.max(0.4, 1 - diff / ORB_DEG),
              evidence: {
                module: 'astro-soul-pattern',
                planets: [tp.name, hp.name],
                aspectType: 'conjunction',
                orbDegrees: diff,
                detail: {
                  layer: 'harmonic',
                  harmonic: h,
                  harmonicLabel: HARMONIC_LABEL[h],
                  harmonicPoint: hp.name,
                  harmonicLongitude: hp.longitude,
                  transitLongitude: tp.longitude,
                },
              },
            })
          }
        }
      }
    }

    return signals
  },
}

export default astroSoulPatternExtractor

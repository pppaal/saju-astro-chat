/**
 * Hourly Event Builder
 *
 * Distributes a day's signal pool across the 12 시진 (Korean traditional
 * 2-hour windows) and surfaces the top 3-5 events with time, layer,
 * polarity, headline, and a short Korean prose snippet.
 *
 * Why 시진 (and not pure ephemeris): a true hour-by-hour transit
 * calculation requires re-running Swiss Ephemeris 24× per day, which is
 * expensive and not needed for the user-facing daily card layer. The
 * 시진 model maps cleanly to existing saju concepts and gives 12 distinct
 * windows that can be assigned by signal layer/family heuristics.
 */

import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import { humanizeKeyword, humanizeSajuBasis, humanizeAstroBasis } from '@/lib/destiny-matrix/ai-report/signalLanguage'

export interface HourlyEvent {
  /** "HH:MM" 24-hour format. */
  time: string
  /** Signal layer, used for icon/color in the UI. */
  layer: number
  polarity: 'strength' | 'caution' | 'balance'
  title: string
  prose: string
  /** Source signal id for evidence trace. */
  signalId: string
}

/**
 * Map a signal's layer/family to a representative hour-of-day. Heuristic:
 * - L1-L3 (foundational/identity): morning ramp (07-11)
 * - L4 (timing/transit): noon-afternoon decisions (12-16)
 * - L5 (relation/aspect): late afternoon to evening (15-19)
 * - L6 (stage): early afternoon (13-15)
 * - L7 (advanced): evening reflection (19-21)
 * - L8 (shinsal): morning luck windows (08-10)
 * - L9-L10 (asteroid/extra): late evening (21-23)
 *
 * Within each band, the offset is determined by signal id hash so the
 * same signal always lands on the same hour for stability across renders.
 */
const LAYER_BANDS: Record<number, [number, number]> = {
  1: [7, 11],
  2: [8, 11],
  3: [9, 12],
  4: [12, 16],
  5: [15, 19],
  6: [13, 15],
  7: [19, 21],
  8: [8, 10],
  9: [21, 23],
  10: [20, 23],
}

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function hourFromSignal(signal: NormalizedSignal): number {
  const band = LAYER_BANDS[signal.layer] || [10, 16]
  const [start, end] = band
  const span = Math.max(1, end - start)
  return start + (hashId(signal.id) % span)
}

const POLARITY_TITLE_TEMPLATES: Record<HourlyEvent['polarity'], string> = {
  strength: '강한 흐름',
  caution: '주의 신호',
  balance: '균형 흐름',
}

function shortTitle(signal: NormalizedSignal): string {
  const kw = humanizeKeyword(signal.keyword)
  if (kw) return kw
  return POLARITY_TITLE_TEMPLATES[signal.polarity]
}

function shortProse(signal: NormalizedSignal): string {
  const saju = humanizeSajuBasis(signal.sajuBasis)
  const astro = humanizeAstroBasis(signal.astroBasis)
  const parts = [saju, astro].filter(Boolean)
  if (parts.length === 0) {
    if (signal.polarity === 'strength') return '이 시간대 결정·실행이 평소보다 잘 통해요.'
    if (signal.polarity === 'caution') return '이 시간대는 한 박자 늦추는 게 안전해요.'
    return '이 시간대는 균형을 유지하며 흐름을 살펴보세요.'
  }
  return `${parts.join(' × ')} 신호가 활성화돼요.`
}

export function buildHourlyEvents(signals: NormalizedSignal[], limit = 5): HourlyEvent[] {
  // Take strongest non-balance signals first, then fill with balance.
  const ranked = [...signals]
    .filter((s) => Boolean(s.keyword || s.sajuBasis || s.astroBasis))
    .sort((a, b) => {
      const polarityScore: Record<string, number> = { strength: 2, caution: 2, balance: 1 }
      const ap = polarityScore[a.polarity] || 1
      const bp = polarityScore[b.polarity] || 1
      if (bp !== ap) return bp - ap
      // Lower layer = more foundational = surface first
      return a.layer - b.layer
    })

  const used = new Set<number>()
  const events: HourlyEvent[] = []

  for (const signal of ranked) {
    if (events.length >= limit) break
    let hour = hourFromSignal(signal)
    // Avoid stacking 2 events on the same hour
    let guard = 0
    while (used.has(hour) && guard < 4) {
      hour = (hour + 1) % 24
      guard++
    }
    used.add(hour)
    events.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      layer: signal.layer,
      polarity: signal.polarity,
      title: shortTitle(signal),
      prose: shortProse(signal),
      signalId: signal.id,
    })
  }

  return events.sort((a, b) => a.time.localeCompare(b.time))
}

/**
 * 24-point energy curve (one value per hour). Each event contributes a
 * Gaussian bump around its hour weighted by polarity. Used for the
 * waveform behind the 87% energy ring in DailyView.
 */
export function buildHourlyEnergyCurve(events: HourlyEvent[]): number[] {
  const curve = new Array(24).fill(40)
  for (const event of events) {
    const center = parseInt(event.time.slice(0, 2), 10)
    const weight = event.polarity === 'strength' ? 35 : event.polarity === 'caution' ? -20 : 15
    for (let h = 0; h < 24; h++) {
      const dist = Math.min(Math.abs(h - center), 24 - Math.abs(h - center))
      const falloff = Math.max(0, 1 - dist / 4)
      curve[h] += weight * falloff
    }
  }
  return curve.map((v) => Math.max(0, Math.min(100, Math.round(v))))
}

export function overallDailyEnergyPercent(curve: number[]): number {
  if (curve.length === 0) return 50
  const sum = curve.reduce((a, b) => a + b, 0)
  return Math.round(sum / curve.length)
}

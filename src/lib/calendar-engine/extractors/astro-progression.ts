import { calculateSecondaryProgressions } from '@/lib/astrology/foundation/progressions'
import { shortestAngle } from '@/lib/astrology/foundation/utils'
import type { AspectType } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { inferAspectPolarity } from '../themes/tagger'

/**
 * 2차 진행법 (Secondary Progressions) 추출기.
 *
 * "1日 = 1年" 룰. 현대 점성술의 핵심 timing 기법.
 * 매월 진행 차트를 계산하고 progressed Moon이 본명 행성과 어떤 어스펙트를 만드는지 추적.
 *
 * 활성 윈도우: 진행 달은 1달에 약 1° 움직이므로 한 어스펙트가 ±2~3개월 활성.
 *
 * 어스펙트 분류는 메이저 5종 + 마이너 5종 (semisextile, quincunx, quintile,
 * biquintile, sesquiquadrate). 모두 ±1.5° orb. 마이너는 fixed polarity 사용.
 *
 * 주: foundation 의 `findProgressedMoonAspects` 는 angle ≤ 3 으로만 필터해
 * conjunction 만 정상 동작 → 다른 호출자 영향 없이 이 추출기에서 inline 으로
 * 본명 행성 → 진행달 각도를 직접 계산해 분류.
 */

const ORB_DEG = 1.5

// 메이저 + 마이너 후보. 첫 매칭 우선 — desired angle 순서 그대로 (작은 orb 가
// 같은 angle 영역에 있을 때 정확한 분류가 되도록).
const ASPECT_CANDIDATES: ReadonlyArray<{ aspect: AspectType; exact: number }> = [
  { aspect: 'conjunction', exact: 0 },
  { aspect: 'semisextile', exact: 30 },
  { aspect: 'sextile', exact: 60 },
  { aspect: 'quintile', exact: 72 },
  { aspect: 'square', exact: 90 },
  { aspect: 'trine', exact: 120 },
  { aspect: 'sesquiquadrate', exact: 135 },
  { aspect: 'biquintile', exact: 144 },
  { aspect: 'quincunx', exact: 150 },
  { aspect: 'opposition', exact: 180 },
]

const MINOR_ASPECT_SET = new Set<AspectType>([
  'semisextile',
  'quincunx',
  'quintile',
  'biquintile',
  'sesquiquadrate',
])

// task spec 의 마이너 polarity 값. Polarity 가 정수(−3..3) 라 round-half-away-from-zero.
// quincunx -0.5 → -1, quintile/biquintile +0.5 → +1, sesquiquadrate -0.3 → -1
// (작은 긴장 신호를 0 으로 묻기보다 -1 로 노출), semisextile 0 → 0.
const MINOR_POLARITY_OVERRIDE: Record<string, Polarity> = {
  semisextile: 0,
  quincunx: -1,
  quintile: 1,
  biquintile: 1,
  sesquiquadrate: -1,
}

const astroProgressionExtractor: SignalExtractor = {
  source: 'astro',
  kind: ['progression', 'progressed-moon'],
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    // 매월 1일 진행 차트 계산
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    while (cursor <= end) {
      const targetIso = cursor.toISOString()
      const cacheKey = `progression:${targetIso}:${natal.input.year}-${natal.input.month}-${natal.input.date}`
      let progressed = cache.get<Awaited<ReturnType<typeof calculateSecondaryProgressions>>>(cacheKey)
      if (!progressed) {
        try {
          progressed = await calculateSecondaryProgressions({
            natal: natal.input,
            targetDate: targetIso,
          })
          cache.set(cacheKey, progressed)
        } catch {
          // silent
          cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
          continue
        }
      }

      const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59))
      const progressedMoon = progressed.planets.find((p) => p.name === 'Moon')
      if (!progressedMoon) {
        cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
        continue
      }

      // 진행달 → 본명 행성 각도 → 어스펙트 분류 (0~180 shortestAngle)
      const natalPlanets = natal.astro.chart.planets ?? []
      for (const target of natalPlanets) {
        const angle = shortestAngle(progressedMoon.longitude, target.longitude)
        const classified = classifyAngle(angle)
        if (!classified) continue
        const isMinor = MINOR_ASPECT_SET.has(classified.aspect)
        const polarity: Polarity = isMinor
          ? MINOR_POLARITY_OVERRIDE[classified.aspect] ?? 0
          : inferAspectPolarity(classified.aspect, 'Moon', target.name)
        const startIso = cursor.toISOString()
        const endIso = monthEnd.toISOString()
        const peakIso = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 15)).toISOString()

        signals.push({
          id: `astro.progressed-moon.${cursor.toISOString().slice(0, 7)}.${classified.aspect}.${target.name}`,
          source: 'astro',
          kind: 'progressed-moon',
          name: `Prog Moon ${classified.aspect} ${target.name}`,
          korean: `진행달 ${classified.aspect} 본명 ${target.name}`,
          themes: [],
          polarity,
          layer: 'monthly',
          active: { start: startIso, peak: peakIso, end: endIso },
          // 마이너 신호는 base weight 살짝 낮게 (메이저 progressed-moon 신호
          // 묻지 않도록). orb tightness 는 동일 1.5° 기준.
          weight:
            (isMinor ? 0.45 : 0.65) * Math.max(0.4, 1 - classified.orb / ORB_DEG),
          evidence: {
            module: 'astro-progression',
            aspectType: classified.aspect,
            orbDegrees: classified.orb,
            planets: ['Moon', target.name],
            detail: { progressionType: 'secondary' },
          },
        })
      }

      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    }

    return signals
  },
}

/**
 * 0~180° 각도를 aspect 종류로 분류. orb는 정확한 각도와의 차이.
 * ORB_DEG 1.5° 안쪽이면 가장 가까운 후보 반환 (메이저·마이너 동일 orb).
 */
function classifyAngle(angle: number): { aspect: AspectType; orb: number } | null {
  let best: { aspect: AspectType; orb: number } | null = null
  for (const c of ASPECT_CANDIDATES) {
    const orb = Math.abs(angle - c.exact)
    if (orb <= ORB_DEG && (best === null || orb < best.orb)) {
      best = { aspect: c.aspect, orb }
    }
  }
  return best
}

export default astroProgressionExtractor

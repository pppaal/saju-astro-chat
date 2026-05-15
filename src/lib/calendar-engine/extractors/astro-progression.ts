import { calculateSecondaryProgressions, findProgressedMoonAspects } from '@/lib/astrology/foundation/progressions'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { inferAspectPolarity } from '../themes/tagger'

/**
 * 2차 진행법 (Secondary Progressions) 추출기.
 *
 * "1日 = 1年" 룰. 현대 점성술의 핵심 timing 기법.
 * 매월 진행 차트를 계산하고 progressed Moon이 본명 행성과 어떤 어스펙트를 만드는지 추적.
 *
 * 활성 윈도우: 진행 달은 1달에 약 1° 움직이므로 한 어스펙트가 ±2~3개월 활성.
 */

const ORB_DEG = 1.5

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

      // 진행 달 → 본명 어스펙트 검사 ({target, angle} 반환)
      const aspects = findProgressedMoonAspects(progressed, natal.astro.chart)
      const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59))

      for (const a of aspects) {
        const classified = classifyAngle(a.angle)
        if (!classified) continue
        const polarity: Polarity = inferAspectPolarity(classified.aspect, 'Moon', a.target)
        const startIso = cursor.toISOString()
        const endIso = monthEnd.toISOString()
        const peakIso = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 15)).toISOString()

        signals.push({
          id: `astro.progressed-moon.${cursor.toISOString().slice(0, 7)}.${classified.aspect}.${a.target}`,
          source: 'astro',
          kind: 'progressed-moon',
          name: `Prog Moon ${classified.aspect} ${a.target}`,
          korean: `진행달 ${classified.aspect} 본명 ${a.target}`,
          themes: [],
          polarity,
          layer: 'monthly',
          active: { start: startIso, peak: peakIso, end: endIso },
          weight: 0.65 * Math.max(0.4, 1 - classified.orb / ORB_DEG),
          evidence: {
            module: 'astro-progression',
            aspectType: classified.aspect,
            orbDegrees: classified.orb,
            planets: ['Moon', a.target],
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
 */
function classifyAngle(angle: number): { aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'; orb: number } | null {
  const candidates = [
    { aspect: 'conjunction' as const, exact: 0 },
    { aspect: 'sextile'     as const, exact: 60 },
    { aspect: 'square'      as const, exact: 90 },
    { aspect: 'trine'       as const, exact: 120 },
    { aspect: 'opposition'  as const, exact: 180 },
  ]
  for (const c of candidates) {
    const orb = Math.abs(angle - c.exact)
    if (orb <= ORB_DEG) return { aspect: c.aspect, orb }
  }
  return null
}

export default astroProgressionExtractor

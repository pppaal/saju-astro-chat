import { findEclipseImpact, getEclipsesBetween } from '@/lib/astrology/foundation/eclipses'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { inferAspectPolarity } from '../themes/tagger'

/**
 * 일식·월식 (Eclipses) 추출기.
 *
 * 활성 윈도우: 이클립스 정점 ±2주. 정점에 강도 최대.
 * polarity: 일식·월식은 본질적으로 큰 변화 트리거 → 어스펙트 종류로 길흉 판정.
 */
const astroEclipseExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'eclipse',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const eclipses = getEclipsesBetween(range.start.slice(0, 10), range.end.slice(0, 10))
    if (eclipses.length === 0) return []

    const impacts = findEclipseImpact(natal.astro.chart, eclipses, 3.0)
    const signals: ActiveSignal[] = []

    for (const impact of impacts) {
      const peakDate = new Date(impact.eclipse.date)
      const startIso = new Date(peakDate.getTime() - 14 * 86_400_000).toISOString()
      const endIso = new Date(peakDate.getTime() + 14 * 86_400_000).toISOString()

      // 어스펙트 종류로 polarity. 이클립스는 컨정션이 가장 강함.
      const basePolarity = inferAspectPolarity(impact.aspectType, 'Sun', impact.affectedPoint)
      const polarity = adjustForEclipseType(basePolarity, impact.eclipse.type)

      signals.push({
        id: `astro.eclipse.${impact.eclipse.date}.${impact.affectedPoint}`,
        source: 'astro',
        kind: 'eclipse',
        name: `${impact.eclipse.type === 'solar' ? '일식' : '월식'} ${impact.aspectType} ${impact.affectedPoint}`,
        korean: `${impact.eclipse.description} → 본명 ${impact.affectedPoint}`,
        themes: [],
        polarity,
        layer: 'monthly',   // 영향 2주~한 달
        active: { start: startIso, peak: peakDate.toISOString(), end: endIso },
        weight: 0.85,       // 이클립스는 강력
        evidence: {
          module: 'astro-eclipse',
          aspectType: impact.aspectType,
          orbDegrees: impact.orb,
          houses: [impact.house],
          planets: [impact.affectedPoint],
          detail: {
            eclipseDate: impact.eclipse.date,
            eclipseType: impact.eclipse.type,
            eclipseSign: impact.eclipse.sign,
            interpretation: impact.interpretation,
          },
        },
      })
    }

    return signals
  },
}

function adjustForEclipseType(basePolarity: Polarity, eclipseType: 'solar' | 'lunar'): Polarity {
  // 이클립스는 일반 어스펙트보다 변화 강도 큼. 한 단계 증폭.
  if (basePolarity > 0) return Math.min(3, basePolarity + 1) as Polarity
  if (basePolarity < 0) return Math.max(-3, basePolarity - 1) as Polarity
  // 중립이면 약한 흉으로 (이클립스의 본질적 disruption)
  return -1
}

export default astroEclipseExtractor

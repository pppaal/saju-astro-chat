import {
  findEclipseImpact,
  getEclipsesBetween,
} from '@/lib/astrology/foundation/eclipses'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'

/**
 * 일식·월식 (Eclipses) 추출기.
 *
 * 활성 윈도우: 이클립스 정점 ±2주. 정점에 강도 최대.
 * polarity:
 *   - 일식 (Sun-Moon conj at Node): 큰 전환 신호 → 기본 -2
 *   - 월식 (Sun-Moon opp at Node): 큰 해소 신호 → 기본 -1
 *   - 본명 행성/ASC/MC 와 합·충: 한 단계 증폭
 *   - 사각 (square): 한 단계 완화
 *   - 매우 타이트한 orb (<1°): 추가 한 단계 강화
 *
 * 데이터 소스: Swiss Ephemeris 실시간 계산 (foundation/eclipses.ts).
 * range.end 가 2030 년 이후라도 정상 동작.
 */
const astroEclipseExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'eclipse',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    // range 윈도우는 짧을 수 있음(달력 한 달치). 이클립스는 ±2주 영향이라
    // 실제로는 range 양옆 ±2주 확장 후 검색해야 "영향 진입/이탈" 신호도 잡힘.
    const rangeStart = new Date(range.start)
    const rangeEnd = new Date(range.end)
    const expandedStart = new Date(rangeStart.getTime() - 14 * 86_400_000)
    const expandedEnd = new Date(rangeEnd.getTime() + 14 * 86_400_000)

    let eclipses: ReturnType<typeof getEclipsesBetween>
    try {
      eclipses = getEclipsesBetween(expandedStart, expandedEnd)
    } catch {
      // Swiss Eph 미사용 환경(테스트 mock 등): 빈 결과로 graceful.
      return []
    }
    if (eclipses.length === 0) return []

    const impacts = findEclipseImpact(natal.astro.chart, eclipses, 3.0)
    const signals: ActiveSignal[] = []

    for (const impact of impacts) {
      const peakDate = new Date(impact.eclipse.date)
      const startIso = new Date(peakDate.getTime() - 14 * 86_400_000).toISOString()
      const endIso = new Date(peakDate.getTime() + 14 * 86_400_000).toISOString()

      const polarity = computeEclipsePolarity(
        impact.eclipse.type,
        impact.aspectType,
        impact.affectedPoint,
        impact.orb,
      )

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
            eclipseKind: impact.eclipse.kind,
            eclipseSign: impact.eclipse.sign,
            interpretation: impact.interpretation,
          },
        },
      })
    }

    return signals
  },
}

/**
 * 일식/월식 + 본명 포인트 합치 시 polarity.
 *
 * - 일식 (solar): 합 (Sun-Moon conj at Node) → 큰 전환. base = -2.
 * - 월식 (lunar): 충 (Sun-Moon opp at Node) → 해소·정리. base = -1.
 * - 본명 행성·ASC·MC 와 합/충 → 추가 한 단계 부정 증폭.
 * - 사각 (square) → 한 단계 완화 (덜 직접적 임팩트).
 * - 매우 타이트한 orb (<1°) → 한 단계 더 강화.
 */
function computeEclipsePolarity(
  eclipseType: 'solar' | 'lunar',
  aspectType: 'conjunction' | 'opposition' | 'square',
  affectedPoint: string,
  orbDegrees: number,
): Polarity {
  // Base by eclipse type.
  let p: number = eclipseType === 'solar' ? -2 : -1

  // 본명 행성과의 합·충: 한 단계 증폭.
  const directPlanetHit =
    aspectType === 'conjunction' || aspectType === 'opposition'
  if (directPlanetHit && isImportantNatalPoint(affectedPoint)) {
    p -= 1
  } else if (aspectType === 'square') {
    // 사각은 직접 합·충보다 한 단계 약화.
    p += 1
  }

  // 매우 타이트한 orb (<1°) → 한 단계 더 강화 (단, 한계 -3).
  if (orbDegrees < 1.0 && directPlanetHit) {
    p -= 1
  }

  // Clamp.
  if (p < -3) p = -3
  if (p > 3) p = 3
  return p as Polarity
}

const IMPORTANT_NATAL_POINTS = new Set([
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
  'ASC',
  'MC',
  'True Node',
  'Mean Node',
])

function isImportantNatalPoint(name: string): boolean {
  return IMPORTANT_NATAL_POINTS.has(name)
}

export default astroEclipseExtractor

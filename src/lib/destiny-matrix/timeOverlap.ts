import type { MatrixCalculationInput, MatrixCell, TransitCycle, WesternElement } from './types'
import type { FiveElement } from '../Saju/types'
import { clamp01 } from './componentScores'

export const TIME_OVERLAP_WEIGHTS = {
  element: 0.5,
  strongSignal: 0.25,
  progression: 0.15,
  density: 0.1,
} as const

const TRANSIT_ELEMENT_MAP: Record<TransitCycle, WesternElement> = {
  saturnReturn: 'earth',
  jupiterReturn: 'fire',
  uranusSquare: 'air',
  neptuneSquare: 'water',
  plutoTransit: 'water',
  nodeReturn: 'air',
  eclipse: 'water',
  mercuryRetrograde: 'air',
  venusRetrograde: 'earth',
  marsRetrograde: 'fire',
  jupiterRetrograde: 'fire',
  saturnRetrograde: 'earth',
}

const SAJU_TO_WESTERN: Record<FiveElement, WesternElement> = {
  목: 'air',
  화: 'fire',
  토: 'earth',
  금: 'air',
  수: 'water',
}

function toWesternElements(elements: Array<FiveElement | undefined>): Set<WesternElement> {
  const mapped = elements
    .filter((element): element is FiveElement => Boolean(element))
    .map((element) => SAJU_TO_WESTERN[element])
  return new Set(mapped)
}

function dominantTransitElements(activeTransits: TransitCycle[]): Set<WesternElement> {
  const counts = new Map<WesternElement, number>()
  for (const transit of activeTransits) {
    const element = TRANSIT_ELEMENT_MAP[transit]
    if (!element) {
      continue
    }
    counts.set(element, (counts.get(element) || 0) + 1)
  }
  if (counts.size === 0) {
    return new Set()
  }
  const max = Math.max(...counts.values())
  const dominant = [...counts.entries()]
    .filter(([, count]) => count === max)
    .map(([element]) => element)
  return new Set(dominant)
}

export interface TimeOverlapResult {
  overlapStrength: number
  timeOverlapWeight: number
}

export function calculateTimeOverlapWeight(
  input: MatrixCalculationInput,
  layer4: Record<string, MatrixCell>,
  layer7: Record<string, MatrixCell>
): TimeOverlapResult {
  const activeTransits = input.activeTransits || []
  const sajuTiming = toWesternElements([input.currentDaeunElement, input.currentSaeunElement])
  const transitDominant = dominantTransitElements(activeTransits)

  let elementOverlap = 0
  if (sajuTiming.size > 0 && transitDominant.size > 0) {
    const matches = [...sajuTiming].filter((element) => transitDominant.has(element)).length
    elementOverlap = clamp01(matches / Math.max(sajuTiming.size, transitDominant.size))
  }

  const strongTransits: TransitCycle[] = [
    'saturnReturn',
    'jupiterReturn',
    'plutoTransit',
    'nodeReturn',
    'eclipse',
  ]
  const strongCount = activeTransits.filter((transit) => strongTransits.includes(transit)).length
  const strongSignal = clamp01(strongCount / 3)

  const progressionSignal = clamp01(Object.keys(layer7).length / 12)
  const timingDensity = clamp01(Object.keys(layer4).length / 6)

  const overlapStrength = clamp01(
    TIME_OVERLAP_WEIGHTS.element * elementOverlap +
      TIME_OVERLAP_WEIGHTS.strongSignal * strongSignal +
      TIME_OVERLAP_WEIGHTS.progression * progressionSignal +
      TIME_OVERLAP_WEIGHTS.density * timingDensity
  )
  const timeOverlapWeight = 1 + 0.3 * overlapStrength

  return {
    overlapStrength,
    timeOverlapWeight: Math.min(1.3, Math.max(1.0, timeOverlapWeight)),
  }
}

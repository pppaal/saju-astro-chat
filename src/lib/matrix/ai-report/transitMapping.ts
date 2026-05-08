import type { TransitCycle } from '../types'

const TRANSIT_CYCLE_SET = new Set<TransitCycle>([
  'saturnReturn',
  'jupiterReturn',
  'uranusSquare',
  'neptuneSquare',
  'plutoTransit',
  'nodeReturn',
  'eclipse',
  'mercuryRetrograde',
  'venusRetrograde',
  'marsRetrograde',
  'jupiterRetrograde',
  'saturnRetrograde',
])

function normalizeTransitCycle(value: unknown): TransitCycle | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null
  if (TRANSIT_CYCLE_SET.has(text as TransitCycle)) return text as TransitCycle
  return null
}

function inferTransitCycleFromRecord(record: Record<string, unknown>): TransitCycle | null {
  const direct = normalizeTransitCycle(record.type)
  if (direct) return direct

  const aspectType = typeof record.aspectType === 'string' ? record.aspectType.toLowerCase() : ''
  const fallbackType = typeof record.type === 'string' ? record.type.toLowerCase() : ''
  const tpRaw =
    typeof record.transitPlanet === 'string'
      ? record.transitPlanet
      : typeof (record.from as Record<string, unknown> | undefined)?.name === 'string'
        ? ((record.from as Record<string, unknown>).name as string)
        : ''
  const npRaw =
    typeof record.natalPlanet === 'string'
      ? record.natalPlanet
      : typeof (record.to as Record<string, unknown> | undefined)?.name === 'string'
        ? ((record.to as Record<string, unknown>).name as string)
        : ''

  const tp = tpRaw.toLowerCase()
  const np = npRaw.toLowerCase()
  const at = aspectType || fallbackType

  if (tp === 'saturn' && np === 'saturn' && at === 'conjunction') return 'saturnReturn'
  if (tp === 'jupiter' && np === 'jupiter' && at === 'conjunction') return 'jupiterReturn'
  if (tp === 'uranus' && at === 'square') return 'uranusSquare'
  if (tp === 'neptune' && at === 'square') return 'neptuneSquare'
  if (tp === 'pluto') return 'plutoTransit'
  if ((tp === 'northnode' || tp === 'southnode' || tp === 'true node') && at === 'conjunction')
    return 'nodeReturn'

  return null
}

const PRIORITY: TransitCycle[] = [
  'saturnReturn',
  'jupiterReturn',
  'nodeReturn',
  'plutoTransit',
  'uranusSquare',
  'neptuneSquare',
  'saturnRetrograde',
  'jupiterRetrograde',
  'marsRetrograde',
  'venusRetrograde',
  'mercuryRetrograde',
  'eclipse',
]

export function mapMajorTransitsToActiveTransits(
  majorTransits: unknown,
  maxCount = 8
): TransitCycle[] {
  if (!Array.isArray(majorTransits) || majorTransits.length === 0) return []

  const found = new Set<TransitCycle>()
  for (const item of majorTransits) {
    if (!item || typeof item !== 'object') continue
    const inferred = inferTransitCycleFromRecord(item as Record<string, unknown>)
    if (inferred) found.add(inferred)
  }

  if (found.size === 0) return []

  const ordered = PRIORITY.filter((cycle) => found.has(cycle))
  return ordered.slice(0, Math.max(5, Math.min(10, Math.floor(maxCount))))
}

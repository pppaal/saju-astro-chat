import type { PersonaAxisKey } from '@/lib/persona/types'

export const INTEGRATED_ICP_ITEM_IDS = [
  'ag_02',
  're_04',
  'wa_03',
  'ag_04',
  'bo_02',
  're_01',
  'wa_04',
  'bo_03',
] as const

type IntegratedIcpItemId = (typeof INTEGRATED_ICP_ITEM_IDS)[number]
type SignedItem = { id: IntegratedIcpItemId; sign: 1 | -1 }

const DIMENSION_RULES = {
  assertiveness: [
    { id: 'ag_02', sign: 1 },
    { id: 'ag_04', sign: -1 },
    { id: 'wa_04', sign: -1 },
  ],
  rumination: [{ id: 're_04', sign: 1 }],
  empathy: [{ id: 'wa_03', sign: 1 }],
  boundary: [
    { id: 'bo_02', sign: 1 },
    { id: 'bo_03', sign: 1 },
  ],
  recovery: [{ id: 're_01', sign: 1 }],
} as const satisfies Record<string, SignedItem[]>

const ICP_DIMENSION_PRIORITY: IcpDimensionKey[] = [
  'assertiveness',
  'boundary',
  'empathy',
  'recovery',
  'rumination',
]

const PRIMARY_AXIS_PRIORITY: PersonaAxisKey[] = ['decision', 'cognition', 'energy', 'rhythm']

const AXIS_CLUSTER_TO_PROFILE_ID = {
  energy: { assertive: 'E_A', attuned: 'E_T', processing: 'E_P' },
  cognition: { assertive: 'C_A', attuned: 'C_T', processing: 'C_P' },
  decision: { assertive: 'D_A', attuned: 'D_T', processing: 'D_P' },
  rhythm: { assertive: 'R_A', attuned: 'R_T', processing: 'R_P' },
} as const

export const INTEGRATED_PROFILE_IDS = [
  'E_A',
  'E_T',
  'E_P',
  'C_A',
  'C_T',
  'C_P',
  'D_A',
  'D_T',
  'D_P',
  'R_A',
  'R_T',
  'R_P',
] as const

export type IntegratedProfileId = (typeof INTEGRATED_PROFILE_IDS)[number]
export type IcpDimensionKey = keyof typeof DIMENSION_RULES
type IntegratedCluster = 'assertive' | 'attuned' | 'processing'

export type IcpDimensionScore = {
  key: IcpDimensionKey
  score: number
  zScore: number
}

export type IcpDimensionResult = {
  scores: Record<IcpDimensionKey, number>
  zScores: Record<IcpDimensionKey, number>
  ranked: IcpDimensionScore[]
  topDimension: IcpDimensionKey
  topCluster: IntegratedCluster
}

export type PersonalityScoresInput = {
  axes: Record<PersonaAxisKey, { score: number }>
  typeCode?: string
}

function normalizeLikert(raw: unknown): number {
  const value = typeof raw === 'string' ? Number(raw) : raw
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value
  }
  return 3
}

function toCenteredLikert(value: number): number {
  return (value - 3) / 2
}

function toPercent(centeredMean: number): number {
  const bounded = Math.max(-1, Math.min(1, centeredMean))
  return Math.round((bounded + 1) * 50)
}

function resolveTopCluster(topDimension: IcpDimensionKey): IntegratedCluster {
  if (topDimension === 'assertiveness' || topDimension === 'boundary') return 'assertive'
  if (topDimension === 'empathy') return 'attuned'
  return 'processing'
}

function pickPrimaryAxis(axes: PersonalityScoresInput['axes']): PersonaAxisKey {
  return [...PRIMARY_AXIS_PRIORITY]
    .map((axis) => ({ axis, tilt: Math.abs((axes[axis]?.score ?? 50) - 50) }))
    .sort(
      (a, b) =>
        b.tilt - a.tilt ||
        PRIMARY_AXIS_PRIORITY.indexOf(a.axis) - PRIMARY_AXIS_PRIORITY.indexOf(b.axis)
    )[0].axis
}

export function computeIcpDimensions(
  answers: Record<string, unknown> | null | undefined
): IcpDimensionResult {
  const scoreEntries = Object.entries(DIMENSION_RULES).map(([dimensionKey, rules]) => {
    const centeredValues = rules.map((rule) => {
      const raw = answers?.[rule.id]
      const centered = toCenteredLikert(normalizeLikert(raw))
      return centered * rule.sign
    })
    const mean =
      centeredValues.reduce((sum, current) => sum + current, 0) / Math.max(1, centeredValues.length)

    return [dimensionKey as IcpDimensionKey, toPercent(mean)] as const
  })

  const scores = Object.fromEntries(scoreEntries) as Record<IcpDimensionKey, number>
  const meanScore =
    Object.values(scores).reduce((sum, current) => sum + current, 0) / ICP_DIMENSION_PRIORITY.length
  const variance =
    Object.values(scores).reduce((sum, current) => sum + Math.pow(current - meanScore, 2), 0) /
    ICP_DIMENSION_PRIORITY.length
  const std = Math.sqrt(variance) || 1

  const zScores = Object.fromEntries(
    Object.entries(scores).map(([key, score]) => [
      key,
      Number(((score - meanScore) / std).toFixed(4)),
    ])
  ) as Record<IcpDimensionKey, number>

  const ranked = [...ICP_DIMENSION_PRIORITY]
    .map((key) => ({ key, score: scores[key], zScore: zScores[key] }))
    .sort(
      (a, b) =>
        b.zScore - a.zScore ||
        ICP_DIMENSION_PRIORITY.indexOf(a.key) - ICP_DIMENSION_PRIORITY.indexOf(b.key)
    )

  const topDimension = ranked[0].key

  return {
    scores,
    zScores,
    ranked,
    topDimension,
    topCluster: resolveTopCluster(topDimension),
  }
}

export function computeIntegratedProfileId(
  personalityScores: PersonalityScoresInput,
  icpDimensions: IcpDimensionResult
): IntegratedProfileId {
  const axis = pickPrimaryAxis(personalityScores.axes)
  const cluster = icpDimensions.topCluster
  return AXIS_CLUSTER_TO_PROFILE_ID[axis][cluster]
}

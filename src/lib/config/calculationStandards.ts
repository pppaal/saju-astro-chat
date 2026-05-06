import type { HouseSystem } from '@/lib/astrology/foundation/types'

export type AstrologyNodeType = 'true' | 'mean'
export type DaeunRoundingPolicy = 'round' | 'ceil' | 'floor'

export const CALCULATION_STANDARDS = {
  saju: {
    baseTimezone: 'Asia/Seoul',
    daeunRounding: 'floor' as DaeunRoundingPolicy,
    useSolarTermsForMonthlyCycles: false,
  },
  astrology: {
    houseSystem: 'Placidus' as HouseSystem,
    nodeType: 'true' as AstrologyNodeType,
  },
} as const

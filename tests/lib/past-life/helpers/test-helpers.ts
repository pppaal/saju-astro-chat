/**
 * Past Life Analyzer Test Helpers
 * Extracted from analyzer.test.ts for reusability
 */

import { analyzePastLife } from '@/lib/past-life/analyzer'

// ============================================================
// Types
// ============================================================
export type SajuData = {
  advancedAnalysis?: {
    geokguk?: { name?: string; type?: string }
    sinsal?: { unluckyList?: Array<{ name?: string; shinsal?: string } | string> }
  }
  dayMaster?: { name?: string; heavenlyStem?: string }
  pillars?: { day?: { heavenlyStem?: string } }
  fourPillars?: { day?: { heavenlyStem?: string } }
}

export type AstroData = {
  planets?: Array<{ name?: string | null; house?: number }>
}

export type KarmicDebt = {
  area: string
  description: string
}

// ============================================================
// Saju Builders
// ============================================================
export const createSajuWithGeokguk = (name: string): SajuData => ({
  advancedAnalysis: { geokguk: { name } },
})

export const createSajuWithGeokgukType = (type: string): SajuData => ({
  advancedAnalysis: { geokguk: { type } },
})

export const createSajuWithDayMaster = (name: string): SajuData => ({
  dayMaster: { name },
})

export const createSajuWithSinsal = (
  unluckyList: Array<{ name?: string; shinsal?: string } | string>
): SajuData => ({
  advancedAnalysis: { sinsal: { unluckyList } },
})

export const createSajuWithPillarsDay = (heavenlyStem: string): SajuData => ({
  pillars: { day: { heavenlyStem } },
})

export const createSajuWithFourPillarsDay = (heavenlyStem: string): SajuData => ({
  fourPillars: { day: { heavenlyStem } },
})

export const createSajuWithDayMasterHeavenlyStem = (heavenlyStem: string): SajuData => ({
  dayMaster: { heavenlyStem },
})

export const createEmptySinsal = (): SajuData => ({
  advancedAnalysis: { sinsal: { unluckyList: [] } },
})

export const createSinsalWithoutName = (): SajuData => ({
  advancedAnalysis: { sinsal: { unluckyList: [{}] } },
})

export const createFullSaju = (options: {
  geokgukName?: string
  geokgukType?: string
  dayMasterName?: string
  sinsalList?: Array<{ name?: string; shinsal?: string } | string>
}): SajuData => ({
  advancedAnalysis: {
    geokguk:
      options.geokgukName || options.geokgukType
        ? {
            name: options.geokgukName,
            type: options.geokgukType,
          }
        : undefined,
    sinsal: options.sinsalList ? { unluckyList: options.sinsalList } : undefined,
  },
  dayMaster: options.dayMasterName ? { name: options.dayMasterName } : undefined,
})

// ============================================================
// Astro Builders
// ============================================================
export const createAstroWithPlanet = (name: string, house: number): AstroData => ({
  planets: [{ name, house }],
})

export const createAstroWithPlanets = (
  planets: Array<{ name: string; house: number }>
): AstroData => ({
  planets,
})

export const createAstroWithNullPlanet = (): AstroData => ({
  planets: [{ name: null, house: 5 }],
})

export const createAstroWithMissingHouse = (): AstroData => ({
  planets: [{ name: 'Saturn' }, { name: 'North Node' }],
})

export const createAstroWithInvalidHouses = (): AstroData => ({
  planets: [
    { name: 'North Node', house: 0 },
    { name: 'Saturn', house: 13 },
  ],
})

// ============================================================
// Analysis Helpers
// ============================================================
export const analyzeKorean = (saju: SajuData | null = null, astro: AstroData | null = null) =>
  analyzePastLife(saju, astro, true)

export const analyzeEnglish = (saju: SajuData | null = null, astro: AstroData | null = null) =>
  analyzePastLife(saju, astro, false)

// ============================================================
// Assertion Helpers
// ============================================================
export const expectKarmicDebtArea = (debts: KarmicDebt[], area: string) => {
  expect(debts.some((d) => d.area === area)).toBe(true)
}

export const expectKarmaScoreInRange = (score: number, min: number, max: number) => {
  expect(score).toBeGreaterThanOrEqual(min)
  expect(score).toBeLessThanOrEqual(max)
}

export const expectContainsKorean = (text: string) => {
  expect(/[\uAC00-\uD7AF]/.test(text)).toBe(true)
}

export const expectContainsEnglish = (text: string) => {
  expect(/[A-Za-z]/.test(text)).toBe(true)
}

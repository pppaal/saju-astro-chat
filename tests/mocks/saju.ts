/**
 * Common Saju library mocks for testing
 */

import { vi } from 'vitest'

/**
 * Mock all Saju-related modules with default implementations
 */
export function mockSajuLibraries() {
  // Core Saju calculation
  vi.mock('@/lib/Saju/saju', () => ({
    calculateSajuData: vi.fn().mockReturnValue({
      fourPillars: {},
      dayMaster: { name: '甲', element: '木' },
      tenGods: {},
    }),
  }))

  // Unse (운세) - fortune cycles
  vi.mock('@/lib/Saju/unse', () => ({
    getDaeunCycles: vi.fn().mockReturnValue([]),
    getAnnualCycles: vi.fn().mockReturnValue([]),
    getMonthlyCycles: vi.fn().mockReturnValue([]),
    getIljinCalendar: vi.fn().mockReturnValue([]),
  }))

  // Shinsal (신살) - special stars
  vi.mock('@/lib/Saju/shinsal', () => ({
    getShinsalHits: vi.fn().mockReturnValue([]),
    getTwelveStagesForPillars: vi.fn().mockReturnValue({}),
    getTwelveShinsalSingleByPillar: vi.fn().mockReturnValue(null),
  }))

  // Relations (관계)
  vi.mock('@/lib/Saju/relations', () => ({
    analyzeRelations: vi.fn().mockReturnValue({ harmonies: [], conflicts: [] }),
    toAnalyzeInputFromSaju: vi.fn().mockReturnValue({}),
  }))

  // Geokguk (격국) - chart pattern
  vi.mock('@/lib/Saju/geokguk', () => ({
    determineGeokguk: vi.fn().mockReturnValue({ name: '정관격', type: 'official' }),
    getGeokgukDescription: vi.fn().mockReturnValue('Leadership pattern'),
  }))

  // Yongsin (용신) - favorable god
  vi.mock('@/lib/Saju/yongsin', () => ({
    determineYongsin: vi.fn().mockReturnValue({ primary: '木', secondary: '水' }),
    getYongsinDescription: vi.fn().mockReturnValue('Wood is favorable'),
    getLuckyColors: vi.fn().mockReturnValue(['green', 'blue']),
    getLuckyDirection: vi.fn().mockReturnValue('East'),
    getLuckyNumbers: vi.fn().mockReturnValue([3, 8]),
  }))

  // Hyeongchung (형충) - clashes and combinations
  vi.mock('@/lib/Saju/hyeongchung', () => ({
    analyzeHyeongchung: vi.fn().mockReturnValue({ clashes: [], punishments: [] }),
  }))

  // Advanced Saju Core
  vi.mock('@/lib/Saju/advancedSajuCore', () => ({
    analyzeAdvancedSaju: vi.fn().mockReturnValue({
      geokguk: {},
      yongsin: {},
      strengths: [],
      weaknesses: [],
    }),
  }))

  return {
    calculateSajuData: vi.fn(),
    getDaeunCycles: vi.fn(),
    getAnnualCycles: vi.fn(),
    getMonthlyCycles: vi.fn(),
    getIljinCalendar: vi.fn(),
    getShinsalHits: vi.fn(),
    getTwelveStagesForPillars: vi.fn(),
    getTwelveShinsalSingleByPillar: vi.fn(),
    analyzeRelations: vi.fn(),
    toAnalyzeInputFromSaju: vi.fn(),
    determineGeokguk: vi.fn(),
    getGeokgukDescription: vi.fn(),
    determineYongsin: vi.fn(),
    getYongsinDescription: vi.fn(),
    getLuckyColors: vi.fn(),
    getLuckyDirection: vi.fn(),
    getLuckyNumbers: vi.fn(),
    analyzeHyeongchung: vi.fn(),
  }
}

/**
 * Mock only core Saju calculation
 */
export function mockSajuCore() {
  vi.mock('@/lib/Saju/saju', () => ({
    calculateSajuData: vi.fn().mockReturnValue({
      fourPillars: {},
      dayMaster: { name: '甲', element: '木' },
      tenGods: {},
    }),
  }))

  return {
    calculateSajuData: vi.fn(),
  }
}

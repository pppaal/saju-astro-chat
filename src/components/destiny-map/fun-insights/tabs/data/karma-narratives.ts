/**
 * karma-narratives.ts - 카르마 내러티브 생성기
 *
 * ✅ REFACTORING COMPLETED:
 * - Original 1071 lines modularized into narratives/ directory
 * - This file is now a facade that re-exports from modules
 *
 * Module structure:
 * - narratives/soulIdentityNarrative.ts: getSoulIdentityNarrative
 * - narratives/lifeDirectionNarrative.ts: getLifeDirectionNarrative
 * - narratives/pastLifeNarrative.ts: getPastLifeNarrative
 * - narratives/growthHealingNarrative.ts: getGrowthHealingNarrative
 * - narratives/energyBalanceNarrative.ts: getEnergyBalanceNarrative
 */

// Re-export everything from the narratives module
export * from './narratives'

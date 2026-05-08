/**
 * advancedTimingEngine.ts - 고급 타이밍 엔진
 *
 * ✅ REFACTORING COMPLETED:
 * - Original 855 lines modularized into timing/ directory
 * - This file is now a facade that re-exports from modules
 *
 * Module structure:
 * - timing/types.ts: 모든 타입 정의
 * - timing/constants/: 상수 데이터 (stem, branch, twelveStage, interaction)
 * - timing/twelveStage.ts: calculatePreciseTwelveStage
 * - timing/branchInteractions.ts: analyzeBranchInteractions
 * - timing/sibsin.ts: calculateSibsin
 * - timing/multiLayer.ts: analyzeMultiLayer
 * - timing/ganji.ts: calculateMonthlyGanji, calculateYearlyGanji
 * - timing/scoring.ts: calculateAdvancedMonthlyScore
 * - timing/promptGenerator.ts: generateAdvancedTimingPromptContext
 */

// Re-export everything from the timing module
export * from './timing';

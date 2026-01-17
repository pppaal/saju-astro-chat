/**
 * Destiny Map Astrology Engine
 * 운명 지도 점성술 엔진
 *
 * @deprecated Import from '@/lib/destiny-map/astrology' instead.
 * This file is maintained for backward compatibility only.
 *
 * The implementation has been modularized into:
 * - astrology/types.ts - Type definitions
 * - astrology/helpers.ts - Utility functions
 * - astrology/saju-orchestrator.ts - Saju calculations
 * - astrology/electional-midpoints.ts - Electional & midpoints
 * - astrology/summary-builder.ts - Summary generation
 * - astrology/engine-core.ts - Main orchestrator
 */

// Re-export everything from the modular structure for backward compatibility
export type { CombinedInput, CombinedResult } from './astrology';
export { computeDestinyMapRefactored as computeDestinyMap } from './astrology';

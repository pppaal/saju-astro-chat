/**
 * Compatibility "report" subsystem — public surface of the deterministic
 * scoring + fusion analysis that powers the legacy `/compatibility` page
 * and (in the future) a dedicated report/export feature.
 *
 * The realtime counselor at `/compatibility/realtime` does NOT consume
 * these functions. It runs entirely off plain-text raw blocks via
 * `@/lib/compatibility/counselor`. Anything score-related, pair-matrix,
 * "12 paragraph narrative" or numeric scoring lives here.
 *
 * This file deliberately doesn't move the implementations — those still
 * live next to their existing call sites in `src/lib/compatibility/*` —
 * it's just a canonical import path for "report stuff" so:
 *   - Future report code has one place to look
 *   - Future cleanup can move impls behind this façade without churning
 *     every call site
 *   - The counselor flow's import surface stays free of score symbols
 */

export {
  calculateFusionCompatibility,
  type FusionCompatibilityResult,
} from '@/lib/compatibility/compatibilityFusion'

export { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
export { performExtendedAstrologyAnalysis } from '@/lib/compatibility/astrology/comprehensive'

export { analyzeCoupleTiming } from '@/lib/compatibility/coupleTimingAnalysis'
export { analyzeCoupleAstroTiming } from '@/lib/compatibility/coupleAstroTiming'
export { analyzeCoupleDeepInsights } from '@/lib/compatibility/coupleDeepInsights'

export type { SajuProfile } from '@/lib/compatibility/cosmicCompatibility'
export type { ExtendedAstrologyProfile } from '@/lib/compatibility/astrology/comprehensive'

// src/lib/saju/index.ts
//
// Public barrel, trimmed to the surface actually imported through it (knip
// audit, 2026-06). Production code imports directly from the source modules
// (`@/lib/saju/saju`, `@/lib/saju/pillarLookup`, …); the only consumer of this
// bare barrel is tests/lib/Saju/index.test.ts, which exercises the symbols
// below. Re-add a named export here only when something imports it via
// `@/lib/saju` rather than its source module.

export * from './constants' // STEMS, BRANCHES, STEM_LABELS, BRANCH_LABELS, …
export { calculateSajuData } from './saju'
export { analyzeStrength } from './tonggeun'
export { getPillarInfo } from './pillarLookup'
export { analyzeSibsinPositions } from './sibsinAnalysis'

/**
 * 운명 통합 엔진 (Unified Engine) v1.0
 * ────────────────────────────────────────
 * 자평력 + 천기력 + 운명력 + Destiny Matrix 한 진입점.
 *
 * 사용:
 *   import { runUnifiedEngine } from '@/lib/engine'
 *
 *   const out = await runUnifiedEngine({
 *     birthDate: '1995-02-09',
 *     birthTime: '06:40',
 *     gender: 'male',
 *   })
 *
 *   // 필요한 부분만 (lazy)
 *   const out = await runUnifiedEngine(input, { include: ['saju', 'cross'] })
 *
 * 페이지별 selector 는 src/lib/engine/selectors/ 에서 추후 추가.
 */
export { runUnifiedEngine } from './orchestrator'
export type { UnifiedInput, UnifiedOptions, UnifiedOutput } from './types'

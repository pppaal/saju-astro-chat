/**
 * @file useLifetime.ts
 * Hook: Lifetime tier (Life — 인생 전체).
 *
 * The Life tier is dominated by the natal context: daewoon spine,
 * gyeokguk, jijanggan, almuten, lots — none of which change moment-to-
 * moment. We currently delegate entirely to useNatalContext; this
 * indirection exists so:
 *
 *   - Adapters (Agent E) target a stable hook name per tier.
 *   - Future Lifetime-specific enrichment (e.g. milestones derived from
 *     transit progressions over the full life span) can be folded in
 *     here without callers rewiring.
 *
 * Returns the same envelope shape as useNatalContext, just under the
 * Lifetime cache key prefix.
 */

'use client'

import type { HookResult, MockOption, RawLifetimePayload, BirthInfoInput } from './types'
import { useNatalContext } from './useNatalContext'

export interface UseLifetimeOptions extends MockOption {
  birthInfo?: BirthInfoInput
  locale?: 'ko' | 'en'
  enabled?: boolean
}

export function useLifetime(options: UseLifetimeOptions = {}): HookResult<RawLifetimePayload> {
  // RawLifetimePayload === RawNatalContextResponse, so this is a thin
  // re-export. Keeping the alias means future Lifetime-only fields can
  // be merged in without changing the public API.
  return useNatalContext(options)
}

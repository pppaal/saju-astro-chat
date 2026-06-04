/**
 * @file index.ts
 * Public barrel for destinypal data hooks.
 *
 * Import surface for downstream callers (5-tier UI pages + adapters):
 *   import { useNatalContext, useYear, ... } from '@/components/destinypal/hooks'
 *
 * Cache helpers and internals are intentionally NOT re-exported —
 * `invalidate()` etc. are an implementation detail and should not be
 * called from UI code (use `refetch()` from the hook envelope instead).
 */

export { useNatalContext } from './useNatalContext'
export type { UseNatalContextOptions } from './useNatalContext'

export { useLifetime } from './useLifetime'
export type { UseLifetimeOptions } from './useLifetime'

export { useDecade } from './useDecade'
export type { UseDecadeOptions } from './useDecade'

export { useYear } from './useYear'
export type { UseYearOptions } from './useYear'

export { useMonth } from './useMonth'
export type { UseMonthOptions } from './useMonth'

export { useDay } from './useDay'
export type { UseDayOptions } from './useDay'

// Shared types — adapters (Agent E) consume these.
export type {
  BirthInfoInput,
  HookResult,
  HookStatus,
  MockOption,
  RawAstrologyResponse,
  RawCalendarResponse,
  RawConvergenceResponse,
  RawDateDetailResponse,
  RawDayPayload,
  RawDecadePayload,
  RawLifetimePayload,
  RawMonthPayload,
  RawNatalContextResponse,
  RawSajuResponse,
  RawYearPayload,
} from './types'

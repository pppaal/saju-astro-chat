/**
 * @file types.ts
 * Minimal local types for destinypal data hooks.
 *
 * Why local types (and not src/types/destinypal/*)?
 * - Agent C owns src/types/destinypal/* (the *destinypal* UI shape — what
 *   data.js looks like in TS). Those are the *adapter output* types.
 * - These hooks return the *raw* backend response (saju / astrology /
 *   calendar engine). Agent E's adapter transforms raw → destinypal shape.
 * - Keeping the hook return type local + opaque (Record<string, unknown>
 *   wrapped in a typed envelope) means:
 *     1. We don't block on Agent C / E. Hooks compile + ship today.
 *     2. When Agent E ships, callers swap `data: RawNatalContextResponse`
 *        for `data: NatalContextDestinypal` by piping through the adapter.
 *
 * Pattern follows useDateDetail.ts — typed envelope, typed cache key,
 * loosely-typed payload (the API contract is the source of truth and
 * has its own schema; this hook is a transport layer).
 */

import type { BirthInfo } from '@/components/calendar/types'

// ─────────────────────────────────────────────────────────────────────
// Envelope — every hook returns this shape (mirrors SWR's API)
// ─────────────────────────────────────────────────────────────────────

export type HookStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Standard hook return envelope.
 * - `data`   null until first successful fetch
 * - `isLoading` true while in-flight (false on cache hit even before fetch)
 * - `error`  null on success, Error on failure
 * - `status` granular state (useful for UI that distinguishes idle vs loading)
 * - `refetch()` force re-fetch (bypasses cache)
 */
export interface HookResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  status: HookStatus
  refetch: () => void
}

// ─────────────────────────────────────────────────────────────────────
// Birth info input
// ─────────────────────────────────────────────────────────────────────

/**
 * Birth input accepted by hooks. Stricter than BirthInfo (birthDate
 * required) but more permissive on the other fields — session profiles
 * may not have birthTime/gender set, and the API endpoints have safe
 * defaults ('00:00' / 'male') for missing fields, so we don't force
 * upstream callers to fabricate values.
 */
export type BirthInfoInput = {
  birthDate: string
  birthTime?: string
  birthPlace?: string
  /** Accept BirthInfo's `'Male'|'Female'` *or* loose strings ('male'/'F').
   *  normalizeGender handles the coercion inside the fetcher. */
  gender?: BirthInfo['gender'] | string
  latitude?: number
  longitude?: number
  timezone?: string
}

// ─────────────────────────────────────────────────────────────────────
// Raw response shapes — opaque to UI (adapter consumes them).
// Each is just the JSON the API endpoint returns. We don't model every
// field here; we model just enough to type-check hook plumbing.
// Agent E's adapter will narrow these down using its own destinypal types.
// ─────────────────────────────────────────────────────────────────────

/** /api/saju POST response (subset) */
export interface RawSajuResponse {
  success?: boolean
  pillars?: Record<string, unknown>
  daeun?: Record<string, unknown>
  yeonun?: Record<string, unknown>
  wolun?: Record<string, unknown>
  shinsal?: Record<string, unknown>
  jijanggan?: Record<string, unknown>
  gyeokguk?: Record<string, unknown>
  yongsin?: Record<string, unknown>
  ilgan?: Record<string, unknown>
  [extra: string]: unknown
}

/** /api/astrology POST response (subset) */
export interface RawAstrologyResponse {
  success?: boolean
  natal?: Record<string, unknown>
  aspects?: unknown[]
  dignities?: Record<string, unknown>
  /** sect can be string ('diurnal'|'nocturnal') or an enriched object. */
  sect?: string | Record<string, unknown>
  almuten?: Record<string, unknown>
  lots?: Record<string, unknown>
  zr?: Record<string, unknown>
  [extra: string]: unknown
}

/** Bundle of saju + astrology — what useNatalContext returns */
export interface RawNatalContextResponse {
  saju: RawSajuResponse
  astrology: RawAstrologyResponse
}

/** /api/calendar GET response (subset). Whole calendar engine payload. */
export interface RawCalendarResponse {
  success?: boolean
  year?: number
  allDates?: unknown[]
  matrixContract?: Record<string, unknown>
  monthly?: unknown[]
  daeun?: Record<string, unknown>
  [extra: string]: unknown
}

/** /api/calendar/convergence response */
export interface RawConvergenceResponse {
  success?: boolean
  convergence?: Record<string, unknown>
  monthly?: unknown[]
  [extra: string]: unknown
}

/** /api/calendar/date-detail response */
export interface RawDateDetailResponse {
  success?: boolean
  data?: Record<string, unknown>
  [extra: string]: unknown
}

// ─────────────────────────────────────────────────────────────────────
// Decade / Year / Month / Day hook payload bundles
// ─────────────────────────────────────────────────────────────────────

/** Decade tier — derived from calendar response + saju daeun list */
export interface RawDecadePayload {
  calendar: RawCalendarResponse
  /** which decade (대운) the requested year falls into */
  daeunIndex?: number
}

/** Year tier — main calendar + convergence (deferred-loaded) */
export interface RawYearPayload {
  calendar: RawCalendarResponse
  convergence: RawConvergenceResponse | null
}

/** Month tier — extracted month slice from yearly calendar */
export interface RawMonthPayload {
  calendar: RawCalendarResponse
  month: number
}

/** Day tier — single-day date-detail response */
export type RawDayPayload = RawDateDetailResponse

/** Lifetime tier — natal context bundle (Life === user's whole chart) */
export type RawLifetimePayload = RawNatalContextResponse

// ─────────────────────────────────────────────────────────────────────
// Mock mode — toggled by NEXT_PUBLIC_DESTINYPAL_MOCK=1 or per-hook prop
// ─────────────────────────────────────────────────────────────────────

export interface MockOption {
  /** When true, hook returns destinypal data.js fixture instead of fetching. */
  mock?: boolean
}

import { describe, it, expect } from 'vitest'
import { makeOptionsKey } from '@/lib/calendar-engine'
import type { CalendarBuildOptions } from '@/lib/calendar-engine/types'

/**
 * Cache-key collision guard for `CalendarBuildOptions`.
 *
 * `getOrBuildMonth` / the in-process memCache historically keyed only on
 * (birthKey, monthKey), but the built cells differ by options
 * (`includeEvidence` strips evidence, `enablePatterns: false` clears
 * matchedPatterns, `enabledExtractors`/`focusThemes` change the signal set).
 * That was latent-safe only because every caller passed
 * `{ includeEvidence: true }`. `makeOptionsKey` folds the options into the
 * cache key so a future caller with a different options shape can't read a
 * stale/wrong cached cell.
 */
describe('makeOptionsKey', () => {
  it('is stable for the current single options shape', () => {
    // If this value ever changes, every existing cache entry built with the
    // default `{ includeEvidence: true }` shape silently invalidates.
    const a = makeOptionsKey({ includeEvidence: true })
    const b = makeOptionsKey({ includeEvidence: true })
    expect(a).toBe(b)
  })

  it('produces different keys for options that change the built cells', () => {
    const withEvidence = makeOptionsKey({ includeEvidence: true })
    const withoutEvidence = makeOptionsKey({ includeEvidence: false })
    const noPatterns = makeOptionsKey({ includeEvidence: true, enablePatterns: false })

    // No two distinct shapes may collide onto the same key.
    const keys = [withEvidence, withoutEvidence, noPatterns]
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('separates an empty/default shape from the evidence-on shape', () => {
    // `{}` and `{ includeEvidence: true }` build different cells (evidence
    // stripped vs kept) — they must not share a cache slot.
    expect(makeOptionsKey({})).not.toBe(makeOptionsKey({ includeEvidence: true }))
  })

  it('is order-insensitive for array options (same set → same key)', () => {
    const a = makeOptionsKey({
      enabledExtractors: ['transit', 'eclipse'],
      focusThemes: [],
    } as CalendarBuildOptions)
    const b = makeOptionsKey({
      enabledExtractors: ['eclipse', 'transit'],
      focusThemes: [],
    } as CalendarBuildOptions)
    expect(a).toBe(b)
  })

  it('distinguishes different enabledExtractors sets', () => {
    const a = makeOptionsKey({ enabledExtractors: ['transit'] })
    const b = makeOptionsKey({ enabledExtractors: ['transit', 'eclipse'] })
    expect(a).not.toBe(b)
  })

  it('returns a short, stable-length hex digest', () => {
    const key = makeOptionsKey({ includeEvidence: true })
    expect(key).toMatch(/^[0-9a-f]{16}$/)
  })
})

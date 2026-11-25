/**
 * Native Swiss Ephemeris gate for real-ephemeris tests.
 *
 * tests/setup.ts mocks swisseph and the ephe accessor globally with constant
 * positions (the Sun sits at the same longitude on every date). A test that checks
 * astronomy instead of wiring runs under `@vitest-environment node`, calls
 * `vi.unmock('swisseph')` and `vi.unmock('@/lib/astrology/foundation/ephe')`, and
 * wraps its blocks in `describeRealEphemeris`.
 *
 * When the native module does not load (ABI mismatch, no build toolchain), those
 * blocks are skipped on a developer machine, but they FAIL in CI and in the destiny
 * release gate. A skipped real-ephemeris suite there would hide exactly the
 * regressions it exists to catch (engine audit F10/F11, stage E16).
 *
 * Import this module only from a file that unmocks swisseph: it throws when it sees
 * the global mock, so a forgotten `vi.unmock` cannot pass as "real".
 */
import { describe, it, vi } from 'vitest'

/** CI, the destiny release gate, or an explicit REQUIRE_SWISSEPH=1 must not skip. */
export const ephemerisRequired =
  process.env.CI === 'true' ||
  process.env.CI === '1' ||
  process.env.REQUIRE_SWISSEPH === '1' ||
  process.env.npm_lifecycle_event === 'test:destiny:release'

let loadError = ''

export const swissephAvailable: boolean = await import('swisseph').then(
  (mod) => {
    const swe = ((mod as { default?: unknown }).default ?? mod) as { swe_calc_ut?: unknown }
    if (typeof swe.swe_calc_ut !== 'function') {
      loadError = 'the swisseph module has no swe_calc_ut'
      return false
    }
    if (vi.isMockFunction(swe.swe_calc_ut)) {
      throw new Error(
        "tests/helpers/realEphemeris imported while swisseph is still mocked — add vi.unmock('swisseph') and vi.unmock('@/lib/astrology/foundation/ephe') to the test file"
      )
    }
    return true
  },
  (error: unknown) => {
    loadError = error instanceof Error ? error.message : String(error)
    return false
  }
)

/**
 * `describe` that runs on the real ephemeris. Without native swisseph it is
 * `describe.skip` locally and a failing test in CI / the release gate.
 */
export function describeRealEphemeris(name: string, fn: () => void): void {
  if (swissephAvailable) {
    describe(name, fn)
    return
  }
  if (ephemerisRequired) {
    describe(name, () => {
      it('native swisseph loads (required in CI and in the destiny release gate)', () => {
        throw new Error(
          `native swisseph did not load (${loadError}). Rebuild it with "npm rebuild swisseph" (needs python3, make and a C++ compiler).`
        )
      })
    })
    return
  }
  describe.skip(name, fn)
}

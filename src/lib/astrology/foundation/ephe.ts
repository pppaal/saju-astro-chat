// Shared Swiss Ephemeris accessor (server-only)
// IMPORTANT: This file must not have any top-level imports that would fail in the browser.
// All Node.js-specific imports (path, swisseph) are done dynamically inside getSwisseph().

import type * as SwissEph from 'swisseph'

let sw: typeof SwissEph | null = null
let ephePathSet = false

type SwissephMock = typeof SwissEph
type JoinFn = (...parts: string[]) => string

const getInjectedSwisseph = (): SwissephMock | null => {
  if (typeof globalThis === 'undefined') {
    return null
  }
  return (globalThis as typeof globalThis & { __SWISSEPH__?: SwissephMock }).__SWISSEPH__ || null
}

const getInjectedJoin = (): JoinFn | null => {
  if (typeof globalThis === 'undefined') {
    return null
  }
  return (
    (globalThis as typeof globalThis & { __EPHE_PATH_JOIN__?: JoinFn }).__EPHE_PATH_JOIN__ || null
  )
}

/**
 * Returns the Swiss Ephemeris module. Server-only.
 * Throws an error if called from the browser.
 */
export function getSwisseph(): typeof SwissEph {
  // Prevent usage in browser environment
  if (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as typeof globalThis & { window?: unknown }).window !== 'undefined'
  ) {
    throw new Error('swisseph is server-only and must not run in the browser.')
  }

  if (!sw) {
    // Dynamic require to avoid bundling into client
    sw = getInjectedSwisseph() || (require('swisseph') as typeof SwissEph)
  }

  if (!ephePathSet && sw) {
    // Dynamic require of path module
    const join = getInjectedJoin() || (require('path') as { join: JoinFn }).join
    const ephePath = process.env.EPHE_PATH || join(process.cwd(), 'public', 'ephe')
    sw.swe_set_ephe_path(ephePath)
    ephePathSet = true
  }

  return sw
}

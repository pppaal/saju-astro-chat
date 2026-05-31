/**
 * clearClientCache
 * -----------------
 * Wipes browser-side Cache Storage entries that may contain
 * authenticated / per-user data. Designed to be called on sign-out
 * (and on detected user-switch) so that the next user on a shared
 * device cannot see the previous user's API responses, profile
 * photos, or page shells via the service-worker cache layer.
 *
 * Why this exists:
 *   We previously configured `@ducanh2912/next-pwa` to runtime-cache
 *   `api.destinypal.com/*` and cross-origin user-content image URLs.
 *   Without a per-user cache key, those entries leaked across
 *   sessions on a shared browser. The vulnerable runtime-cache
 *   entries have been removed (see next.config.ts), but old Cache
 *   Storage buckets from prior service-worker versions can still
 *   linger on real users' devices. Purging on sign-out closes the
 *   gap immediately while the new SW rolls out.
 */

export type ClearClientCacheResult = {
  /** Whether the Cache Storage API was available in this environment. */
  supported: boolean
  /** Number of caches successfully deleted. */
  cleared: number
  /** Names of caches we attempted to delete (best-effort). */
  attempted: string[]
}

/**
 * Delete every entry in `window.caches`.
 *
 * - Safe to call in non-browser environments (SSR, older browsers
 *   without the Cache Storage API): resolves with
 *   `{ supported: false, cleared: 0, attempted: [] }`.
 * - Never throws — individual `caches.delete` failures are swallowed
 *   so a single bad cache name cannot block sign-out.
 */
export async function clearClientCache(): Promise<ClearClientCacheResult> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { supported: false, cleared: 0, attempted: [] }
  }

  try {
    const cacheStorage = window.caches
    const names = await cacheStorage.keys()
    const results = await Promise.all(
      names.map(async (name) => {
        try {
          return await cacheStorage.delete(name)
        } catch {
          return false
        }
      })
    )
    const cleared = results.filter(Boolean).length
    return { supported: true, cleared, attempted: names }
  } catch {
    return { supported: true, cleared: 0, attempted: [] }
  }
}

/**
 * Per-user data persisted in localStorage that must NOT survive a
 * sign-out. Cache Storage (above) only covered SW-cached API responses;
 * the birth info / profile a user typed lives in localStorage and was
 * lingering after logout — so "Load saved info" kept showing for the
 * next (signed-out) visitor, and their name/birthdate leaked on shared
 * devices. Keys mirror their owning modules:
 *   - 'destinypal:birthInfo:v1'   → src/app/(main)/birthInfoStorage.ts (KEY)
 *   - 'destinypal_user_profile'   → src/lib/userProfile.ts (USER_PROFILE_KEY)
 */
const LOCAL_USER_DATA_KEYS = ['destinypal:birthInfo:v1', 'destinypal_user_profile'] as const

/**
 * Remove per-user birth/profile data from localStorage. Safe in
 * non-browser environments and never throws.
 */
export function clearLocalUserData(): void {
  if (typeof window === 'undefined' || !('localStorage' in window)) return
  for (const key of LOCAL_USER_DATA_KEYS) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Best-effort: a single failing key must not block sign-out.
    }
  }
}

/**
 * Convenience wrapper for sign-out flows. Clears the client cache
 * then invokes the provided sign-out callback. Cache clearing runs
 * first so that even if `signOut` redirects mid-flight, the caches
 * have already been purged.
 */
export async function clearClientCacheAndSignOut(
  signOutFn: () => Promise<unknown> | unknown
): Promise<void> {
  try {
    await clearClientCache()
    clearLocalUserData()
  } catch {
    // Never let cache clearing block sign-out.
  }
  await signOutFn()
}

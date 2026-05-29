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
 * sessionStorage 키 중 로그아웃 시 정리해야 하는 것들.
 * 로그아웃 후에도 남아 있으면 사용자에게 잘못된 UI state 보임.
 *   dp:home-white — 홈 화면 cosmic(보라) vs premium(흰) 모드 결정.
 *                   로그아웃 했는데 같은 탭에 남아 있으면 보라로 안 돌아옴.
 */
const SESSION_STORAGE_KEYS_TO_CLEAR = ['dp:home-white']

/** sessionStorage 의 사용자 state flag 들 정리. 안 되는 환경 (SSR 등) 은 무시. */
function clearSessionFlags(): void {
  if (typeof window === 'undefined') return
  try {
    for (const key of SESSION_STORAGE_KEYS_TO_CLEAR) {
      window.sessionStorage.removeItem(key)
    }
  } catch {
    /* private mode / blocked — 무시 */
  }
}

/**
 * Convenience wrapper for sign-out flows. Clears the client cache
 * then invokes the provided sign-out callback. Cache clearing runs
 * first so that even if `signOut` redirects mid-flight, the caches
 * have already been purged.
 *
 * Also clears sessionStorage UI flags (home-white) so the next visit
 * starts on the cosmic surface instead of being stuck on premium-white.
 */
export async function clearClientCacheAndSignOut(
  signOutFn: () => Promise<unknown> | unknown
): Promise<void> {
  try {
    await clearClientCache()
  } catch {
    // Never let cache clearing block sign-out.
  }
  clearSessionFlags()
  await signOutFn()
}

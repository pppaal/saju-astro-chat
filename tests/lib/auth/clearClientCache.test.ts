import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  clearClientCache,
  clearClientCacheAndSignOut,
} from '@/lib/auth/clearClientCache'

// Regression: shared-device sign-out used to leave the service-worker
// Cache Storage populated with user A's API responses and profile
// photos. When user B signed in on the same browser, the SW could
// serve user A's data. clearClientCache wipes every Cache Storage
// bucket on sign-out to close that gap; these tests lock in the
// contract.

type FakeCacheStorage = {
  keys: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

function installFakeCaches(impl: Partial<FakeCacheStorage>): FakeCacheStorage {
  const fake: FakeCacheStorage = {
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
    ...impl,
  }
  // Cast through unknown since CacheStorage has more members we don't need.
  Object.defineProperty(window, 'caches', {
    configurable: true,
    value: fake as unknown as CacheStorage,
  })
  return fake
}

function removeCaches(): void {
  // Drop the property entirely so the "missing caches" branch can be tested.
  Object.defineProperty(window, 'caches', {
    configurable: true,
    value: undefined,
  })
  // @ts-expect-error -- deleting an indexed property for the unsupported case
  delete (window as { caches?: unknown }).caches
}

describe('clearClientCache', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls caches.keys then caches.delete for every cache', async () => {
    const fake = installFakeCaches({
      keys: vi.fn().mockResolvedValue(['api-cache', 'static-images', 'google-fonts']),
      delete: vi.fn().mockResolvedValue(true),
    })

    const result = await clearClientCache()

    expect(fake.keys).toHaveBeenCalledTimes(1)
    expect(fake.delete).toHaveBeenCalledTimes(3)
    expect(fake.delete).toHaveBeenCalledWith('api-cache')
    expect(fake.delete).toHaveBeenCalledWith('static-images')
    expect(fake.delete).toHaveBeenCalledWith('google-fonts')
    expect(result).toEqual({
      supported: true,
      cleared: 3,
      attempted: ['api-cache', 'static-images', 'google-fonts'],
    })
  })

  it('returns supported=false when window.caches is missing (older browsers)', async () => {
    removeCaches()

    const result = await clearClientCache()

    expect(result).toEqual({ supported: false, cleared: 0, attempted: [] })
  })

  it('does not throw if an individual cache.delete rejects', async () => {
    const fake = installFakeCaches({
      keys: vi.fn().mockResolvedValue(['a', 'b']),
      delete: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('boom')),
    })

    const result = await clearClientCache()

    expect(fake.delete).toHaveBeenCalledTimes(2)
    expect(result.supported).toBe(true)
    // Only the successful delete should be counted.
    expect(result.cleared).toBe(1)
    expect(result.attempted).toEqual(['a', 'b'])
  })

  it('swallows errors from caches.keys and still resolves', async () => {
    installFakeCaches({
      keys: vi.fn().mockRejectedValue(new Error('storage offline')),
    })

    const result = await clearClientCache()

    // We reported the API as available but cleared nothing — sign-out must
    // never be blocked by Cache Storage flakiness.
    expect(result).toEqual({ supported: true, cleared: 0, attempted: [] })
  })

  it('returns cleared=0 when there are no caches', async () => {
    const fake = installFakeCaches({
      keys: vi.fn().mockResolvedValue([]),
    })

    const result = await clearClientCache()

    expect(fake.delete).not.toHaveBeenCalled()
    expect(result).toEqual({ supported: true, cleared: 0, attempted: [] })
  })
})

describe('clearClientCacheAndSignOut', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    installFakeCaches({
      keys: vi.fn().mockResolvedValue(['api-cache']),
      delete: vi.fn().mockResolvedValue(true),
    })
  })

  it('clears caches first, then invokes the sign-out callback', async () => {
    const order: string[] = []
    const fakeCaches = window.caches as unknown as FakeCacheStorage
    fakeCaches.delete.mockImplementation(async () => {
      order.push('delete')
      return true
    })
    const signOutFn = vi.fn(async () => {
      order.push('signOut')
    })

    await clearClientCacheAndSignOut(signOutFn)

    expect(signOutFn).toHaveBeenCalledTimes(1)
    expect(order).toEqual(['delete', 'signOut'])
  })

  it('still calls signOut even if cache clearing throws', async () => {
    const fakeCaches = window.caches as unknown as FakeCacheStorage
    fakeCaches.keys.mockRejectedValueOnce(new Error('blocked'))
    const signOutFn = vi.fn()

    await clearClientCacheAndSignOut(signOutFn)

    expect(signOutFn).toHaveBeenCalledTimes(1)
  })
})

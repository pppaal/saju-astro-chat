/**
 * threadsToken — Threads 토큰 보관·갱신 단위 테스트.
 *
 * Redis(cacheGet/cacheSet)와 fetch 를 mock 해 활성 토큰 조회(우선순위)와
 * refresh 성공/실패/토큰없음을 검증.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const cacheGet = vi.fn()
const cacheSet = vi.fn()
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: (...a: unknown[]) => cacheGet(...a),
  cacheSet: (...a: unknown[]) => cacheSet(...a),
}))

import {
  getActiveThreadsToken,
  refreshThreadsToken,
  setActiveThreadsToken,
} from '@/lib/social/publish/threadsToken'

const originalEnv = process.env

describe('threadsToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    cacheGet.mockResolvedValue(null)
    cacheSet.mockResolvedValue(true)
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('getActiveThreadsToken', () => {
    it('Redis 에 갱신본이 있으면 그걸 쓴다(env 보다 우선)', async () => {
      cacheGet.mockResolvedValueOnce('redis-token')
      process.env.THREADS_ACCESS_TOKEN = 'env-token'
      expect(await getActiveThreadsToken()).toBe('redis-token')
    })

    it('Redis 가 비면 env 초기 시드로 폴백', async () => {
      cacheGet.mockResolvedValueOnce(null)
      process.env.THREADS_ACCESS_TOKEN = 'env-token'
      expect(await getActiveThreadsToken()).toBe('env-token')
    })

    it('둘 다 없으면 빈 문자열', async () => {
      cacheGet.mockResolvedValueOnce(null)
      delete process.env.THREADS_ACCESS_TOKEN
      expect(await getActiveThreadsToken()).toBe('')
    })
  })

  describe('refreshThreadsToken', () => {
    it('토큰이 아예 없으면 no_token', async () => {
      cacheGet.mockResolvedValue(null)
      delete process.env.THREADS_ACCESS_TOKEN
      const res = await refreshThreadsToken()
      expect(res).toEqual({ ok: false, error: 'no_token' })
      expect(cacheSet).not.toHaveBeenCalled()
    })

    it('성공하면 새 토큰을 Redis 에 보관하고 expiresIn 반환', async () => {
      process.env.THREADS_ACCESS_TOKEN = 'old-token'
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'new-token', expires_in: 5_184_000 }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const res = await refreshThreadsToken()
      expect(res.ok).toBe(true)
      expect(res.expiresIn).toBe(5_184_000)
      // refresh 엔드포인트 호출(현재 토큰 사용)
      const calledUrl = String(fetchMock.mock.calls[0][0])
      expect(calledUrl).toContain('refresh_access_token')
      expect(calledUrl).toContain('old-token')
      // 새 토큰 보관 — 만료 하루 전 여유로 TTL 단축
      expect(cacheSet).toHaveBeenCalledWith(
        'threads:access_token',
        'new-token',
        5_184_000 - 24 * 60 * 60
      )
    })

    it('HTTP 실패면 ok:false + 상태코드, 보관 안 함', async () => {
      process.env.THREADS_ACCESS_TOKEN = 'old-token'
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' })
      )
      const res = await refreshThreadsToken()
      expect(res.ok).toBe(false)
      expect(res.error).toContain('400')
      expect(cacheSet).not.toHaveBeenCalled()
    })

    it('응답에 access_token 이 없으면 실패', async () => {
      process.env.THREADS_ACCESS_TOKEN = 'old-token'
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ expires_in: 100 }) })
      )
      const res = await refreshThreadsToken()
      expect(res.ok).toBe(false)
      expect(cacheSet).not.toHaveBeenCalled()
    })
  })

  describe('setActiveThreadsToken', () => {
    it('Redis 에 TTL 과 함께 쓴다', async () => {
      await setActiveThreadsToken('tok', 1000)
      expect(cacheSet).toHaveBeenCalledWith('threads:access_token', 'tok', 1000)
    })
  })
})

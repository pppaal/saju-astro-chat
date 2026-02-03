import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchWithRetry, FetchWithRetryError, enforceBodySize } from '@/lib/http'

// Mock global fetch
global.fetch = vi.fn()

describe('http.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('fetchWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockResponse = new Response('success', { status: 200 })
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse)

      const response = await fetchWithRetry('https://api.example.com/test')

      expect(response).toBe(mockResponse)
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should retry on network error', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('success', { status: 200 }))

      const promise = fetchWithRetry('https://api.example.com/test', {}, { maxRetries: 3 })

      // Fast-forward through the delay
      await vi.runAllTimersAsync()

      const response = await promise

      expect(response.status).toBe(200)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should retry on 500 error', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response('error', { status: 500 }))
        .mockResolvedValueOnce(new Response('success', { status: 200 }))

      const promise = fetchWithRetry('https://api.example.com/test')

      await vi.runAllTimersAsync()

      const response = await promise

      expect(response.status).toBe(200)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should retry on 502 error', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response('error', { status: 502 }))
        .mockResolvedValueOnce(new Response('success', { status: 200 }))

      const promise = fetchWithRetry('https://api.example.com/test')

      await vi.runAllTimersAsync()

      const response = await promise

      expect(response.status).toBe(200)
    })

    it('should retry on 503 error', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response('error', { status: 503 }))
        .mockResolvedValueOnce(new Response('success', { status: 200 }))

      const promise = fetchWithRetry('https://api.example.com/test')

      await vi.runAllTimersAsync()

      const response = await promise

      expect(response.status).toBe(200)
    })

    it('should retry on 429 rate limit', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
        .mockResolvedValueOnce(new Response('success', { status: 200 }))

      const promise = fetchWithRetry('https://api.example.com/test')

      await vi.runAllTimersAsync()

      const response = await promise

      expect(response.status).toBe(200)
    })

    it('should not retry on 404 error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('not found', { status: 404 }))

      const response = await fetchWithRetry('https://api.example.com/test')

      expect(response.status).toBe(404)
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should throw after max retries', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const promise = fetchWithRetry('https://api.example.com/test', {}, { maxRetries: 2 })

      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow(FetchWithRetryError)
      expect(fetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should use exponential backoff', async () => {
      const delays: number[] = []
      const onRetry = vi.fn((attempt, error, delay) => {
        delays.push(delay)
      })

      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const promise = fetchWithRetry('https://api.example.com/test', {}, {
        maxRetries: 3,
        initialDelayMs: 1000,
        onRetry,
      })

      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()

      expect(onRetry).toHaveBeenCalledTimes(3)
      // Each delay should be roughly 2x the previous (with jitter)
      expect(delays[0]).toBeGreaterThanOrEqual(1000)
      expect(delays[1]).toBeGreaterThanOrEqual(2000)
      expect(delays[2]).toBeGreaterThanOrEqual(4000)
    })

    it('should respect maxDelayMs', async () => {
      const delays: number[] = []
      const onRetry = vi.fn((attempt, error, delay) => {
        delays.push(delay)
      })

      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const promise = fetchWithRetry('https://api.example.com/test', {}, {
        maxRetries: 5,
        initialDelayMs: 10000,
        maxDelayMs: 15000,
        onRetry,
      })

      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()

      // All delays should be <= maxDelayMs
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(15000)
      })
    })

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn()

      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('success', { status: 200 }))

      const promise = fetchWithRetry('https://api.example.com/test', {}, {
        maxRetries: 3,
        onRetry,
      })

      await vi.runAllTimersAsync()

      await promise

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(
        1,
        expect.any(Error),
        expect.any(Number)
      )
    })

    it('should handle custom retry status codes', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response('error', { status: 418 })) // Teapot
        .mockResolvedValueOnce(new Response('success', { status: 200 }))

      const promise = fetchWithRetry('https://api.example.com/test', {}, {
        retryStatusCodes: [418],
      })

      await vi.runAllTimersAsync()

      const response = await promise

      expect(response.status).toBe(200)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should pass request options to fetch', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('success', { status: 200 }))

      await fetchWithRetry('https://api.example.com/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'data' }),
        })
      )
    })

    it('should include attempts in error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const promise = fetchWithRetry('https://api.example.com/test', {}, { maxRetries: 2 })

      await vi.runAllTimersAsync()

      try {
        await promise
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(FetchWithRetryError)
        const fetchError = error as FetchWithRetryError
        expect(fetchError.attempts).toBe(3)
      }
    })

    it('should mark timeout errors correctly', async () => {
      vi.mocked(fetch).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 100)
        })
      })

      const promise = fetchWithRetry('https://api.example.com/test', {}, {
        timeoutMs: 50,
        maxRetries: 0,
      })

      await vi.runAllTimersAsync()

      try {
        await promise
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(FetchWithRetryError)
        const fetchError = error as FetchWithRetryError
        expect(fetchError.isTimeout).toBe(true)
      }
    })

    it('should handle external abort signal', async () => {
      const controller = new AbortController()

      vi.mocked(fetch).mockImplementation(() => {
        controller.abort()
        return Promise.reject(new DOMException('Aborted', 'AbortError'))
      })

      const promise = fetchWithRetry('https://api.example.com/test', {
        signal: controller.signal,
      })

      await expect(promise).rejects.toThrow('Request was cancelled')
    })

    it('should work with URL object', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('success', { status: 200 }))

      const url = new URL('https://api.example.com/test')
      await fetchWithRetry(url)

      expect(fetch).toHaveBeenCalledWith(url, expect.any(Object))
    })
  })

  describe('enforceBodySize', () => {
    it('should return null for requests within size limit', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
        body: 'x'.repeat(1000),
      })

      const result = enforceBodySize(req, 2000)

      expect(result).toBeNull()
    })

    it('should return error response for oversized requests', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': '300000' },
        body: 'x'.repeat(300000),
      })

      const result = enforceBodySize(req, 256 * 1024)

      expect(result).not.toBeNull()
      expect(result?.status).toBe(413)
    })

    it('should include limit in error response', async () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': '300000' },
      })

      const result = enforceBodySize(req, 256 * 1024)
      const data = await result?.json()

      expect(data?.error).toBe('payload_too_large')
      expect(data?.limit).toBe(256 * 1024)
    })

    it('should return null when Content-Length header is missing', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        body: 'test',
      })

      const result = enforceBodySize(req, 1000)

      expect(result).toBeNull()
    })

    it('should return null for invalid Content-Length', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': 'invalid' },
        body: 'test',
      })

      const result = enforceBodySize(req, 1000)

      expect(result).toBeNull()
    })

    it('should return null for negative Content-Length', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': '-100' },
        body: 'test',
      })

      const result = enforceBodySize(req, 1000)

      expect(result).toBeNull()
    })

    it('should use default maxBytes of 256KB', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': String(300 * 1024) },
      })

      const result = enforceBodySize(req)

      expect(result).not.toBeNull()
      expect(result?.status).toBe(413)
    })

    it('should pass through custom headers', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': '300000' },
      })

      const customHeaders = {
        'X-RateLimit-Limit': '10',
        'X-Custom-Header': 'test',
      }

      const result = enforceBodySize(req, 1000, customHeaders)

      expect(result?.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(result?.headers.get('X-Custom-Header')).toBe('test')
    })

    it('should handle exact size limit', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
        body: 'x'.repeat(1000),
      })

      const result = enforceBodySize(req, 1000)

      expect(result).toBeNull()
    })

    it('should handle zero Content-Length', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': '0' },
      })

      const result = enforceBodySize(req, 1000)

      expect(result).toBeNull()
    })

    it('should reject when Content-Length is one byte over', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': '1001' },
      })

      const result = enforceBodySize(req, 1000)

      expect(result).not.toBeNull()
      expect(result?.status).toBe(413)
    })
  })

  describe('FetchWithRetryError', () => {
    it('should contain error details', () => {
      const lastError = new Error('Network failure')
      const error = new FetchWithRetryError('Failed after retries', 3, lastError, true)

      expect(error.message).toBe('Failed after retries')
      expect(error.attempts).toBe(3)
      expect(error.lastError).toBe(lastError)
      expect(error.isTimeout).toBe(true)
      expect(error.name).toBe('FetchWithRetryError')
    })

    it('should default isTimeout to false', () => {
      const error = new FetchWithRetryError('Failed', 1, new Error('test'))

      expect(error.isTimeout).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large maxRetries', async () => {
      let callCount = 0
      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        if (callCount < 10) {
          return Promise.reject(new Error('Still failing'))
        }
        return Promise.resolve(new Response('success', { status: 200 }))
      })

      const promise = fetchWithRetry('https://api.example.com/test', {}, {
        maxRetries: 50,
        initialDelayMs: 10,
      })

      await vi.runAllTimersAsync()

      const response = await promise

      expect(response.status).toBe(200)
      expect(callCount).toBe(10)
    })

    it('should handle zero maxRetries', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const promise = fetchWithRetry('https://api.example.com/test', {}, { maxRetries: 0 })

      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow(FetchWithRetryError)
      expect(fetch).toHaveBeenCalledTimes(1) // Only initial attempt
    })

    it('should handle Content-Length with whitespace', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': ' 2000 ' },
      })

      const result = enforceBodySize(req, 1000)

      expect(result).not.toBeNull()
      expect(result?.status).toBe(413)
    })

    it('should handle Infinity in Content-Length', () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': 'Infinity' },
      })

      const result = enforceBodySize(req, 1000)

      expect(result).toBeNull() // Non-finite should be ignored
    })
  })
})

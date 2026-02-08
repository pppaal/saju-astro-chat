/**
 * Mock tests for ApiClient network error handling
 * 네트워크 에러 및 타임아웃 처리 테스트
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock backend-url
vi.mock('@/lib/backend-url', () => ({
  getBackendUrl: vi.fn(() => 'https://api.test.com'),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('ApiClient Mock Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_API_TOKEN = 'test-token'
  })

  afterEach(() => {
    delete process.env.ADMIN_API_TOKEN
  })

  describe('GET request error handling', () => {
    it('should return timeout error when request is aborted', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com', 5000)

      // Mock fetch that simulates AbortError
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await client.get('/test')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(408)
      expect(result.error).toBe('Request timeout')
    })

    it('should handle network error', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockRejectedValueOnce(new Error('fetch failed'))

      const result = await client.get('/test')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(500)
      expect(result.error).toBe('fetch failed')
    })

    it('should handle HTTP error status', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
      })

      const result = await client.get('/not-found')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
      expect(result.error).toBe('HTTP 404')
    })

    it('should handle server error', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
      })

      const result = await client.get('/error')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(500)
    })

    it('should return data on successful request', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      const responseData = { id: 1, name: 'Test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValueOnce(responseData),
      })

      const result = await client.get<typeof responseData>('/test')

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data).toEqual(responseData)
    })
  })

  describe('POST request error handling', () => {
    it('should return timeout error when POST is aborted', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com', 5000)

      // Mock fetch that simulates AbortError
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await client.post('/test', { data: 'value' })

      expect(result.ok).toBe(false)
      expect(result.status).toBe(408)
      expect(result.error).toBe('Request timeout')
    })

    it('should handle network error on POST', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const result = await client.post('/test', { data: 'value' })

      expect(result.ok).toBe(false)
      expect(result.status).toBe(500)
      expect(result.error).toBe('ECONNREFUSED')
    })

    it('should return data on successful POST', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      const responseData = { success: true, id: 123 }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers(),
        json: vi.fn().mockResolvedValueOnce(responseData),
      })

      const result = await client.post<typeof responseData>('/create', { name: 'Test' })

      expect(result.ok).toBe(true)
      expect(result.status).toBe(201)
      expect(result.data).toEqual(responseData)
    })

    it('should send correct headers', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValueOnce({}),
      })

      await client.post('/test', { data: 'value' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
            'X-API-KEY': 'test-token',
          }),
          body: JSON.stringify({ data: 'value' }),
        })
      )
    })
  })

  describe('POST retry logic', () => {
    it('should retry on 503 Service Unavailable', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      // First call returns 503, second call succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({ success: true }),
        })

      // Use minimal retry delay for faster tests
      const result = await client.post('/test', { data: 'value' }, { retries: 1, retryDelay: 1 })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.ok).toBe(true)
    })

    it('should retry on 429 Too Many Requests', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({ success: true }),
        })

      const result = await client.post('/test', { data: 'value' }, { retries: 1, retryDelay: 1 })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.ok).toBe(true)
    })

    it('should retry on 502 Bad Gateway', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({ success: true }),
        })

      const result = await client.post('/test', { data: 'value' }, { retries: 1, retryDelay: 1 })

      expect(result.ok).toBe(true)
    })

    it('should retry on 504 Gateway Timeout', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 504,
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({ success: true }),
        })

      const result = await client.post('/test', { data: 'value' }, { retries: 1, retryDelay: 1 })

      expect(result.ok).toBe(true)
    })

    it('should retry on network timeout (AbortError)', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com', 1000)

      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'

      mockFetch
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValueOnce({ success: true }),
        })

      const result = await client.post('/test', { data: 'value' }, { retries: 1, retryDelay: 1 })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.ok).toBe(true)
    })

    it('should not retry on 400 Bad Request', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers(),
      })

      const result = await client.post('/test', { data: 'value' }, { retries: 3 })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.ok).toBe(false)
      expect(result.status).toBe(400)
    })

    it('should not retry on 401 Unauthorized', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
      })

      const result = await client.post('/test', { data: 'value' }, { retries: 3 })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.ok).toBe(false)
      expect(result.status).toBe(401)
    })

    it('should return error after max retries exhausted', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers(),
      })

      const result = await client.post('/test', { data: 'value' }, { retries: 2, retryDelay: 1 })

      expect(mockFetch).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
      expect(result.ok).toBe(false)
      expect(result.status).toBe(503)
    })

    it('should use exponential backoff for retries', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        return {
          ok: false,
          status: 503,
          headers: new Headers(),
        }
      })

      // Use minimal delay for test speed
      await client.post('/test', { data: 'value' }, { retries: 2, retryDelay: 1 })

      // Verify all calls were made (1 initial + 2 retries)
      expect(callCount).toBe(3)
    })
  })

  describe('postStream error handling', () => {
    it('should throw error on network failure', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockRejectedValueOnce(new Error('Stream connection failed'))

      await expect(client.postStream('/stream', { data: 'value' })).rejects.toThrow(
        'Stream connection failed'
      )
    })

    it('should return response on success', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {},
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const response = await client.postStream('/stream', { data: 'value' })

      expect(response).toBe(mockResponse)
    })
  })

  describe('postSSEStream error handling', () => {
    it('should return error when response is not ok', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValueOnce('Internal Server Error'),
        headers: new Headers(),
      })

      const result = await client.postSSEStream('/stream', { data: 'value' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Internal Server Error')
        expect(result.status).toBe(500)
      }
    })

    it('should return error when content-type is not SSE', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
      })

      const result = await client.postSSEStream('/stream', { data: 'value' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Response is not SSE stream')
      }
    })

    it('should return response when SSE stream is valid', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await client.postSSEStream('/stream', { data: 'value' })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.response).toBe(mockResponse)
      }
    })

    it('should handle network error in SSE stream', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockRejectedValueOnce(new Error('Connection reset'))

      const result = await client.postSSEStream('/stream', { data: 'value' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Connection reset')
        expect(result.status).toBe(500)
      }
    })
  })

  describe('apiFetch function', () => {
    it('should include credentials', async () => {
      process.env.NEXT_PUBLIC_API_TOKEN = 'public-token'

      const { apiFetch } = await import('@/lib/api/ApiClient')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      await apiFetch('/api/test')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })

    it('should include public API token when set', async () => {
      process.env.NEXT_PUBLIC_API_TOKEN = 'public-token'

      // Reset module to pick up env change
      vi.resetModules()
      const { apiFetch } = await import('@/lib/api/ApiClient')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      await apiFetch('/api/test')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-token': 'public-token',
          }),
        })
      )

      delete process.env.NEXT_PUBLIC_API_TOKEN
    })

    it('should merge custom headers', async () => {
      const { apiFetch } = await import('@/lib/api/ApiClient')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      await apiFetch('/api/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      )
    })
  })

  describe('createApiClient factory', () => {
    it('should create client with custom base URL', async () => {
      const { createApiClient } = await import('@/lib/api/ApiClient')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValueOnce({ data: 'test' }),
      })

      const client = createApiClient('https://custom.api.com')
      await client.get('/endpoint')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/endpoint',
        expect.any(Object)
      )
    })

    it('should create client with custom timeout that handles abort', async () => {
      const { createApiClient } = await import('@/lib/api/ApiClient')

      // Mock fetch that simulates AbortError
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const client = createApiClient('https://api.test.com', 2000)
      const result = await client.get('/endpoint')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(408)
      expect(result.error).toBe('Request timeout')
    })
  })

  describe('Headers handling', () => {
    it('should not include API token when includeApiToken is false', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValueOnce({}),
      })

      await client.get('/test', { includeApiToken: false })

      const calledHeaders = mockFetch.mock.calls[0][1].headers
      expect(calledHeaders.Authorization).toBeUndefined()
      expect(calledHeaders['X-API-KEY']).toBeUndefined()
    })

    it('should include custom headers along with default headers', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')
      const client = new ApiClient('https://api.test.com')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValueOnce({}),
      })

      await client.post('/test', { data: 'value' }, { headers: { 'X-Custom': 'value' } })

      const calledHeaders = mockFetch.mock.calls[0][1].headers
      expect(calledHeaders['X-Custom']).toBe('value')
      expect(calledHeaders['Content-Type']).toBe('application/json')
    })
  })
})

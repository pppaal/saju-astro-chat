// src/lib/api/ApiClient.ts
// API client for internal Next.js routes (and any explicitly-provided baseUrl).
// The Python AI backend was removed — the singleton no longer points anywhere
// by default; callers must pass an explicit baseUrl or use root-relative paths.

import { logger } from '@/lib/logger'

// ==========================================
// Simple fetch wrapper for internal API calls
// ==========================================

export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  /**
   * 401/402 를 받아도 전역 크레딧/로그인 모달을 띄우지 않는다. 사용자가 명시적으로
   * 시작하지 않은 조용한 부수작업(예: 진입 시 컨텍스트 워밍)에서 쓴다 —
   * 비로그인 게스트에게 진입하자마자 로그인 모달이 뜨는 걸 막는다.
   */
  suppressAuthModal?: boolean
}

/**
 * 크레딧/인증 관련 응답을 단일 지점에서 감지해 전역 이벤트로 알린다. 크레딧을
 * 쓰는 모든 호출이 apiFetch 를 거치면, 어떤 화면이든 동일하게 모달이 뜬다.
 * (플로우마다 모달을 따로 부르던 불일치 제거.)
 *  - 402 → 크레딧 소진(로그인 사용자) → 구매 유도 (CreditModalContext)
 *  - 401 → 비로그인 → blur 로그인 모달 (LoginModalContext)
 * body 는 건드리지 않으므로 SSE 스트리밍 응답에도 안전하다.
 */
export const CREDIT_MODAL_EVENT = 'dp:credit-modal'
export type CreditModalKind = 'depleted' | 'guest'

function notifyCreditLimit(res: Response): void {
  if (typeof window === 'undefined') return
  let kind: CreditModalKind | null = null
  if (res.status === 402) kind = 'depleted'
  // 401 = 비로그인. 게스트 폐지 후 모든 gated 액션은 로그인 필수 → blur 로그인
  // 모달로 유도(LoginModalContext 가 'guest' 이벤트를 수신). (audit 2026-06)
  else if (res.status === 401) kind = 'guest'
  if (!kind) return
  try {
    window.dispatchEvent(new CustomEvent(CREDIT_MODAL_EVENT, { detail: { kind } }))
  } catch {
    /* 모달 신호 실패가 요청 자체를 깨뜨리면 안 됨 */
  }
}

/**
 * Wrapper around fetch for API requests to Next.js internal routes.
 * Authentication is handled server-side via session cookies - no client tokens needed.
 */
export async function apiFetch(url: string, options?: ApiFetchOptions): Promise<Response> {
  const { suppressAuthModal, ...fetchOptions } = options ?? {}
  const headers: Record<string, string> = {
    ...options?.headers,
  }

  // Add public API token for internal API routes that require it
  // This token is public (exposed to client) and used for basic API access control
  const publicToken = process.env.NEXT_PUBLIC_API_TOKEN
  if (publicToken) {
    headers['x-api-token'] = publicToken
  }

  // Note: Authentication is handled via httpOnly session cookies
  // No need to send tokens from client-side - this prevents token exposure

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Ensure cookies are sent with requests
  })
  // 크레딧/게스트 한도 응답이면 전역 모달 신호. body 는 안 읽으므로 스트림 안전.
  if (!suppressAuthModal) notifyCreditLimit(response)
  return response
}

// ==========================================
// Backend API Client
// ==========================================

export interface ApiClientOptions {
  /** Request timeout in milliseconds (default: 60000) */
  timeout?: number
  /** Custom headers */
  headers?: Record<string, string>
  /** Include API token from env */
  includeApiToken?: boolean
  /** Number of retries on transient failures (default: 0) */
  retries?: number
  /** Delay between retries in ms (default: 1000, doubles each retry) */
  retryDelay?: number
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
  headers?: Headers
}

/**
 * Unified API client for backend requests
 * Handles: timeout, AbortController, auth headers, error handling
 */
export class ApiClient {
  private explicitBaseUrl?: string
  private defaultTimeout: number

  constructor(baseUrl?: string, defaultTimeout = 60000) {
    this.explicitBaseUrl = baseUrl
    this.defaultTimeout = defaultTimeout
  }

  private resolveBaseUrl(): string {
    // If caller injected a base URL, keep it. Otherwise return empty string —
    // root-relative paths (`/api/...`) hit the same Next.js host the request
    // came from, which is what every internal API call wants.
    return this.explicitBaseUrl || ''
  }

  /**
   * Build headers with optional API token
   */
  private buildHeaders(
    options: ApiClientOptions = {},
    contentType = 'application/json'
  ): Record<string, string> {
    const apiToken = process.env.ADMIN_API_TOKEN
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...options.headers,
    }

    // Add Authorization header (preferred) or X-API-KEY fallback
    if (options.includeApiToken !== false && apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`
      headers['X-API-KEY'] = apiToken // Fallback for legacy endpoints
    }

    return headers
  }

  /**
   * Check if an error/status is retryable (transient failures)
   */
  private isRetryable(status: number): boolean {
    return status === 408 || status === 429 || status === 502 || status === 503 || status === 504
  }

  /**
   * POST request with automatic timeout, error handling, and optional retry
   */
  async post<T = unknown>(
    path: string,
    body: unknown,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    const maxRetries = options.retries ?? 1
    const baseDelay = options.retryDelay ?? 1000

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController()
      const timeout = options.timeout ?? this.defaultTimeout
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(`${this.resolveBaseUrl()}${path}`, {
          method: 'POST',
          headers: this.buildHeaders(options),
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorPreview = await response.text().catch(() => '')
          const result: ApiResponse<T> = {
            ok: false,
            status: response.status,
            error: `HTTP ${response.status}${errorPreview ? `: ${errorPreview.slice(0, 240)}` : ''}`,
            headers: response.headers,
          }

          if (attempt < maxRetries && this.isRetryable(response.status)) {
            const delay = baseDelay * Math.pow(2, attempt)
            logger.warn(
              `[ApiClient] Retrying POST ${path} (attempt ${attempt + 1}/${maxRetries}, status ${response.status})`
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          return result
        }

        const data = await response.json()
        return {
          ok: true,
          status: response.status,
          data: data as T,
          headers: response.headers,
        }
      } catch (err) {
        clearTimeout(timeoutId)

        const isTimeout = err instanceof Error && err.name === 'AbortError'
        const isNetworkError =
          err instanceof Error &&
          (err.message.includes('fetch') ||
            err.message.includes('ECONNREFUSED') ||
            err.message.includes('ECONNRESET') ||
            err.message.includes('EAI_AGAIN') ||
            err.message.includes('ENOTFOUND') ||
            err.message.includes('ETIMEDOUT') ||
            err.message.includes('TLS') ||
            err.message.includes('socket disconnected'))

        if (attempt < maxRetries && (isTimeout || isNetworkError)) {
          const delay = baseDelay * Math.pow(2, attempt)
          logger.warn(
            `[ApiClient] Retrying POST ${path} (attempt ${attempt + 1}/${maxRetries}, ${isTimeout ? 'timeout' : 'network error'})`
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        if (isTimeout) {
          return {
            ok: false,
            status: 408,
            error: 'Request timeout',
          }
        }

        return {
          ok: false,
          status: 500,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    }

    return { ok: false, status: 500, error: 'Max retries exceeded' }
  }

  /**
   * GET request with automatic timeout
   */
  async get<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<ApiResponse<T>> {
    const controller = new AbortController()
    const timeout = options.timeout ?? this.defaultTimeout
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(`${this.resolveBaseUrl()}${path}`, {
        method: 'GET',
        headers: this.buildHeaders(options),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: `HTTP ${response.status}`,
          headers: response.headers,
        }
      }

      const data = await response.json()
      return {
        ok: true,
        status: response.status,
        data: data as T,
        headers: response.headers,
      }
    } catch (err) {
      clearTimeout(timeoutId)

      if (err instanceof Error && err.name === 'AbortError') {
        return {
          ok: false,
          status: 408,
          error: 'Request timeout',
        }
      }

      return {
        ok: false,
        status: 500,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  /**
   * POST request returning raw Response for streaming
   * Use this for SSE streams or other streaming responses
   */
  async postStream(path: string, body: unknown, options: ApiClientOptions = {}): Promise<Response> {
    const controller = new AbortController()
    const timeout = options.timeout ?? this.defaultTimeout
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(`${this.resolveBaseUrl()}${path}`, {
        method: 'POST',
        headers: this.buildHeaders(options),
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: 'no-store',
      })

      clearTimeout(timeoutId)
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      logger.error('[ApiClient] Stream request failed:', err)
      throw err // Throw instead of returning null for better error handling
    }
  }

  /**
   * POST request for SSE streaming with validation
   * Automatically checks if response is SSE and handles errors
   */
  async postSSEStream(
    path: string,
    body: unknown,
    options: ApiClientOptions = {}
  ): Promise<{ ok: true; response: Response } | { ok: false; error: string; status: number }> {
    try {
      const response = await this.postStream(path, body, options)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        return {
          ok: false,
          error: errorText,
          status: response.status,
        }
      }

      // Validate SSE response
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('text/event-stream')) {
        return {
          ok: false,
          error: 'Response is not SSE stream',
          status: response.status,
        }
      }

      return { ok: true, response }
    } catch (err) {
      logger.error('[ApiClient] SSE stream error:', err)
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Stream request failed',
        status: 500,
      }
    }
  }
}

// Singleton instance for convenience
export const apiClient = new ApiClient()

// Factory function for custom instances
export function createApiClient(baseUrl?: string, timeout?: number): ApiClient {
  return new ApiClient(baseUrl, timeout)
}

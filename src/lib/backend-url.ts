/**
 * AI Backend URL 선택 유틸리티
 * 35개 이상의 API route에서 중복되어 있던 로직을 통합
 */

import { logger } from '@/lib/logger'

const warned = {
  nonHttps: false,
  deprecated: false,
  public: false,
}

function isLocalBackendUrl(url: string): boolean {
  return (
    url.startsWith('http://localhost') ||
    url.startsWith('http://127.0.0.1') ||
    url.startsWith('http://0.0.0.0')
  )
}

function warnOnce(key: keyof typeof warned, message: string): void {
  if (!warned[key]) {
    warned[key] = true
    logger.warn(message)
  }
}

export function getBackendUrl(): string {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.BACKEND_AI_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    'http://localhost:5000'

  // Production 환경에서 HTTP 사용 경고
  if (
    process.env.NODE_ENV === 'production' &&
    !url.startsWith('https://') &&
    !isLocalBackendUrl(url)
  ) {
    warnOnce('nonHttps', '[Backend] Using non-HTTPS AI backend in production')
  }

  // NEXT_PUBLIC_* 환경 변수는 클라이언트에 노출되므로 보안 경고
  if (process.env.BACKEND_AI_URL && !process.env.AI_BACKEND_URL) {
    warnOnce('deprecated', '[Backend] BACKEND_AI_URL is deprecated; use AI_BACKEND_URL')
  }
  const publicBackend = process.env.NEXT_PUBLIC_AI_BACKEND
  if (
    publicBackend &&
    !process.env.AI_BACKEND_URL &&
    !process.env.BACKEND_AI_URL &&
    !isLocalBackendUrl(publicBackend)
  ) {
    warnOnce(
      'public',
      '[Backend] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL for security'
    )
  }

  return url
}

export function getPublicBackendUrl(): string {
  return process.env.NEXT_PUBLIC_AI_BACKEND || 'http://localhost:5000'
}

'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

/**
 * Next.js 최상위 error boundary — root layout 까지 깨졌을 때 실행되므로
 * 자체 <html><body> 가 필요. design tokens 를 직접 import 할 수 없어
 * (CSS 변수가 root <html> 컨텍스트에 의존) 인라인 스타일로 다크 cosmic
 * 톤을 직접 표현.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Global error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          background:
            'radial-gradient(900px 600px at 50% -10%, rgba(212,181,114,0.18), transparent), radial-gradient(700px 500px at 80% 110%, rgba(212,181,114,0.08), transparent), #07091a',
          color: '#f5f7fb',
          fontFamily:
            "'Pretendard Variable', Pretendard, ui-sans-serif, system-ui, sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 16px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420 }} role="alert">
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 28px',
              borderRadius: '999px',
              background: 'rgba(212,181,114,0.10)',
              boxShadow: 'inset 0 0 0 1px rgba(212,181,114,0.32)',
              color: '#d4b572',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <circle cx="12" cy="17" r="0.6" fill="currentColor" />
            </svg>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-cinzel, 'Cinzel'), Georgia, serif",
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '0.01em',
              margin: '0 0 12px',
              lineHeight: 1.2,
            }}
          >
            문제가 발생했어요
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: 'rgba(245,247,251,0.62)',
              margin: '0 0 32px',
            }}
          >
            예기치 못한 오류가 발생했어요. 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '10px 24px',
              borderRadius: 999,
              border: 'none',
              background: '#d4b572',
              color: '#1c1917',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: 24,
                fontSize: 11,
                letterSpacing: '0.04em',
                color: 'rgba(245,247,251,0.35)',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}

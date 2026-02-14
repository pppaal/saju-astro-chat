'use client'

import { useEffect, useState } from 'react'

type LoadingTimeoutProps = {
  timeoutMs?: number
  loadingText?: string
  fallbackText?: string
}

export default function LoadingTimeout({
  timeoutMs = 10000,
  loadingText = 'Loading',
  fallbackText = 'Taking longer than expected. Please refresh or try again shortly.',
}: LoadingTimeoutProps) {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), timeoutMs)
    return () => window.clearTimeout(timer)
  }, [timeoutMs])

  if (timedOut) {
    return (
      <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: '20px 12px' }}>
        {fallbackText}
      </div>
    )
  }

  return (
    <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: '20px 12px' }}>
      <div
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          margin: '0 auto 10px',
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.2)',
          borderTopColor: 'rgba(255,255,255,0.85)',
          animation: 'spin 1s linear infinite',
        }}
      />
      {loadingText}
      <style>
        {'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}
      </style>
    </div>
  )
}

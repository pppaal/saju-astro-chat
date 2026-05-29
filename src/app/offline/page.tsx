'use client'

import { useEffect, useRef, useState } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  // Track the pending auto-redirect so a flaky network that drops out
  // again within the 1s grace period cancels the navigation instead of
  // landing the user on /  with no connection.
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const cancelPendingRedirect = () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
        redirectTimerRef.current = null
      }
    }

    const handleOnline = () => {
      setIsOnline(true)
      // Don't stack timers if `online` fires repeatedly on a flaky
      // connection — clear the previous redirect first.
      cancelPendingRedirect()
      redirectTimerRef.current = setTimeout(() => {
        redirectTimerRef.current = null
        window.location.href = '/'
      }, 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      // Cancel the pending redirect; the user is offline again so '/'
      // would just fail silently.
      cancelPendingRedirect()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      cancelPendingRedirect()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md mx-auto">
        {/* Offline Icon */}
        <div className="mb-8">
          <svg
            className="w-24 h-24 mx-auto text-[#d4b572]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-.707-7.364m1.414 5.95l-2.829 2.829m0 0l-3.536 3.536M3 3l3.536 3.536"
            />
          </svg>
        </div>

        {/* Status Message */}
        <h1 className="text-3xl font-bold text-white mb-4">
          {isOnline ? '다시 연결되었습니다!' : '오프라인 상태입니다'}
        </h1>

        <p className="text-gray-300 mb-8">
          {isOnline
            ? '잠시 후 메인 페이지로 이동합니다...'
            : '인터넷 연결을 확인해주세요. 연결되면 자동으로 복구됩니다.'}
        </p>

        {/* Retry Button */}
        {!isOnline && (
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#d4b572] hover:bg-[#e8cc8a] text-[#1c1917] rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#d4b572] focus:ring-offset-2 focus:ring-offset-[#07091a]"
          >
            다시 시도
          </button>
        )}

        {/* Loading indicator when online */}
        {isOnline && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4b572]" />
          </div>
        )}

        {/* Tips */}
        <div className="mt-12 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <h2 className="text-sm font-semibold text-[#e8cc8a] mb-2">
            오프라인에서 할 수 있는 것들
          </h2>
          <ul className="text-sm text-gray-400 space-y-1 text-left">
            <li>• 이전에 본 페이지는 캐시에서 볼 수 있습니다</li>
            <li>• 앱을 설치하면 더 빠르게 접근할 수 있습니다</li>
            <li>• Wi-Fi나 데이터를 확인해주세요</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

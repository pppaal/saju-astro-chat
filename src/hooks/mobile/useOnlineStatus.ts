import { useEffect, useState } from 'react'

/**
 * 온라인/오프라인 상태 감지
 *
 * @returns isOnline - 온라인 상태 여부
 *
 * @example
 * const isOnline = useOnlineStatus();
 *
 * return isOnline ? <App /> : <OfflineMessage />
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

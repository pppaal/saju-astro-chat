import { useEffect, useState, useRef, RefObject } from 'react'

/**
 * Pull-to-Refresh 기능
 *
 * @param onRefresh - 새로고침 시 실행될 콜백
 * @param threshold - 새로고침 트리거 임계값 (기본: 80px)
 * @returns containerRef - 컨테이너에 연결할 ref
 *
 * @example
 * const containerRef = usePullToRefresh(async () => {
 *   await fetchData();
 * });
 *
 * return <div ref={containerRef}>...</div>
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  threshold = 80
): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let refreshIndicator: HTMLDivElement | null = null

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].pageY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY > 0 || isRefreshing) return

      currentY.current = e.touches[0].pageY
      const distance = currentY.current - startY.current

      if (distance > 0 && distance < threshold * 2) {
        if (!refreshIndicator) {
          refreshIndicator = document.createElement('div')
          refreshIndicator.className = 'pull-to-refresh'
          refreshIndicator.textContent = '새로고침하려면 아래로 당기세요'
          document.body.appendChild(refreshIndicator)
        }

        const progress = Math.min(distance / threshold, 1)
        refreshIndicator.style.transform = `translateX(-50%) translateY(${-100 + progress * 100}%)`

        if (distance > threshold) {
          refreshIndicator.textContent = '놓아서 새로고침'
        } else {
          refreshIndicator.textContent = '새로고침하려면 아래로 당기세요'
        }
      }
    }

    let outerTimer: ReturnType<typeof setTimeout> | null = null
    let innerTimer: ReturnType<typeof setTimeout> | null = null

    const handleTouchEnd = async () => {
      const distance = currentY.current - startY.current

      if (refreshIndicator) {
        if (distance > threshold && !isRefreshing) {
          refreshIndicator.textContent = '새로고침 중...'
          refreshIndicator.classList.add('active')
          setIsRefreshing(true)

          try {
            await onRefresh()
          } finally {
            outerTimer = setTimeout(() => {
              if (refreshIndicator) {
                refreshIndicator.classList.remove('active')
                innerTimer = setTimeout(() => {
                  refreshIndicator?.remove()
                  refreshIndicator = null
                }, 300)
              }
              setIsRefreshing(false)
            }, 500)
          }
        } else {
          refreshIndicator.remove()
          refreshIndicator = null
        }
      }

      startY.current = 0
      currentY.current = 0
    }

    container.addEventListener('touchstart', handleTouchStart)
    container.addEventListener('touchmove', handleTouchMove)
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      if (outerTimer) clearTimeout(outerTimer)
      if (innerTimer) clearTimeout(innerTimer)
      if (refreshIndicator) {
        refreshIndicator.remove()
      }
    }
  }, [onRefresh, threshold, isRefreshing])

  return containerRef
}

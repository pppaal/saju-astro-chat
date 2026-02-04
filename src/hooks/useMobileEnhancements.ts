/**
 * Mobile UX Enhancement Hooks
 * 모바일 사용자 경험을 개선하기 위한 커스텀 훅 모음
 */

import { useEffect, useState, useCallback, useRef, RefObject } from 'react'

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

/**
 * 터치 피드백 효과
 *
 * @returns handleTouchStart - 요소에 연결할 터치 이벤트 핸들러
 *
 * @example
 * const handleTouchStart = useTapFeedback();
 *
 * return <button onTouchStart={handleTouchStart}>Click me</button>
 */
export function useTapFeedback() {
  return useCallback((e: React.TouchEvent<HTMLElement>) => {
    const target = e.currentTarget
    target.classList.add('tap-feedback')

    const handleTouchEnd = () => {
      setTimeout(() => {
        target.classList.remove('tap-feedback')
      }, 300)
      target.removeEventListener('touchend', handleTouchEnd)
    }

    target.addEventListener('touchend', handleTouchEnd)
  }, [])
}

/**
 * 스와이프 제스처 감지
 *
 * @param onSwipeLeft - 왼쪽 스와이프 시 실행될 콜백
 * @param onSwipeRight - 오른쪽 스와이프 시 실행될 콜백
 * @param threshold - 스와이프 인식 임계값 (기본: 50px)
 * @returns ref - 스와이프를 감지할 요소에 연결할 ref
 *
 * @example
 * const swipeRef = useSwipeGesture(
 *   () => logger.info('Swiped left'),
 *   () => logger.info('Swiped right')
 * );
 *
 * return <div ref={swipeRef}>Swipeable content</div>
 */
export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].pageX
      startY.current = e.touches[0].pageY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].pageX
      const endY = e.changedTouches[0].pageY
      const deltaX = endX - startX.current
      const deltaY = endY - startY.current

      // 수평 스와이프가 수직 스와이프보다 클 때만 인식
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      }
    }

    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, threshold])

  return ref
}

/**
 * 모바일 기기 감지
 *
 * @returns isMobile - 모바일 기기 여부
 *
 * @example
 * const isMobile = useIsMobile();
 *
 * return isMobile ? <MobileView /> : <DesktopView />
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

/**
 * 화면 방향 감지
 *
 * @returns orientation - 'portrait' | 'landscape'
 *
 * @example
 * const orientation = useOrientation();
 *
 * return <div className={orientation === 'landscape' ? 'landscape-layout' : ''}>...</div>
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  return orientation
}

/**
 * Bottom Sheet 관리
 *
 * @returns [isOpen, open, close] - 상태와 제어 함수들
 *
 * @example
 * const [isOpen, openSheet, closeSheet] = useBottomSheet();
 *
 * return (
 *   <>
 *     <button onClick={openSheet}>Open</button>
 *     {isOpen && <BottomSheet onClose={closeSheet}>...</BottomSheet>}
 *   </>
 * )
 */
export function useBottomSheet(): [boolean, () => void, () => void] {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => {
    setIsOpen(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    document.body.style.overflow = ''
  }, [])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return [isOpen, open, close]
}

/**
 * Toast 알림 관리
 *
 * @returns showToast - Toast를 표시하는 함수
 *
 * @example
 * const showToast = useToast();
 *
 * showToast('저장되었습니다!', 'success');
 */
export function useToast() {
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3000) => {
      const container =
        document.querySelector('.toast-container') ||
        (() => {
          const div = document.createElement('div')
          div.className = 'toast-container'
          document.body.appendChild(div)
          return div
        })()

      const toast = document.createElement('div')
      toast.className = `toast ${type}`

      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
      }

      toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
      `

      container.appendChild(toast)

      // 애니메이션을 위한 지연
      requestAnimationFrame(() => {
        toast.classList.add('show')
      })

      // 자동 제거
      setTimeout(() => {
        toast.classList.remove('show')
        setTimeout(() => toast.remove(), 300)
      }, duration)

      return toast
    },
    []
  )

  return showToast
}

/**
 * 키보드 높이 감지 (iOS 대응)
 *
 * @returns keyboardHeight - 키보드 높이 (px)
 *
 * @example
 * const keyboardHeight = useKeyboardHeight();
 *
 * return <div style={{ paddingBottom: keyboardHeight }}>...</div>
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      const vh = window.visualViewport?.height || window.innerHeight
      const wh = window.innerHeight
      setKeyboardHeight(Math.max(0, wh - vh))
    }

    window.visualViewport?.addEventListener('resize', handleResize)

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [])

  return keyboardHeight
}

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

/**
 * Haptic Feedback (진동)
 *
 * @returns triggerHaptic - 햅틱 피드백을 트리거하는 함수
 *
 * @example
 * const triggerHaptic = useHapticFeedback();
 *
 * <button onClick={() => {
 *   triggerHaptic('medium');
 *   // 버튼 동작
 * }}>Click</button>
 */
export function useHapticFeedback() {
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 50,
      }
      navigator.vibrate(patterns[intensity])
    }
  }, [])

  return triggerHaptic
}

/**
 * 스크롤 방향 감지
 *
 * @returns [scrollDirection, scrollY] - 스크롤 방향과 현재 위치
 *
 * @example
 * const [scrollDirection, scrollY] = useScrollDirection();
 *
 * return (
 *   <header className={scrollDirection === 'down' ? 'hidden' : ''}>
 *     ...
 *   </header>
 * )
 */
export function useScrollDirection(): ['up' | 'down' | null, number] {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  const [scrollY, setScrollY] = useState(0)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setScrollY(currentScrollY)

      if (currentScrollY > lastScrollY.current) {
        setScrollDirection('down')
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDirection('up')
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return [scrollDirection, scrollY]
}

import { useEffect, useRef, RefObject } from 'react'

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

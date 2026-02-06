import React, { useCallback } from 'react'

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

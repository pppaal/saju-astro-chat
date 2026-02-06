import { useCallback } from 'react'

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

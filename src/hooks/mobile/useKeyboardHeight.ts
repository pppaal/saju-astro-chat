import { useEffect, useState } from 'react'

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

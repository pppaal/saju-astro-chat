import { useEffect, useState } from 'react'

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

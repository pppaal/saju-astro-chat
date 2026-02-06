import { useEffect, useState } from 'react'

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

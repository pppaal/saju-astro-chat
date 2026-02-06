import { useEffect, useState, useRef } from 'react'

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

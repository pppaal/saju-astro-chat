// GoogleAnalytics — 클라이언트 내비게이션 페이지 뷰도 정화한 URL 만 보낸다(QA-7, PMS-5).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'

const nav = { pathname: '/integrated-report', search: '' }
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}))
vi.mock('next/script', () => ({ default: () => null }))
vi.mock('@/contexts/ConsentContext', () => ({ useConsent: () => ({ status: 'granted' }) }))

import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'

type W = Window & { gtag?: (...args: unknown[]) => void }

describe('GoogleAnalytics — page_path/page_location 정화', () => {
  const gtag = vi.fn()
  beforeEach(() => {
    gtag.mockClear()
    ;(window as W).gtag = gtag
  })
  afterEach(() => {
    delete (window as W).gtag
  })

  it('출생 쿼리 링크로 들어와도 config/set 에 출생 정보가 없다', () => {
    nav.pathname = '/integrated-report'
    nav.search =
      'lang=en&date=1997-03-21&time=14:30&tu=0&lat=37.5665&lng=126.978&tz=Asia%2FSeoul&gender=female&place=Seoul&utm_source=kakao'
    render(<GoogleAnalytics gaId="G-TEST123" />)

    const config = gtag.mock.calls.find((c) => c[0] === 'config')
    const set = gtag.mock.calls.find((c) => c[0] === 'set')
    const origin = window.location.origin
    expect(config).toEqual([
      'config',
      'G-TEST123',
      {
        page_path: '/integrated-report?lang=en&utm_source=kakao',
        page_location: `${origin}/integrated-report?lang=en&utm_source=kakao`,
      },
    ])
    expect(set?.[1]).toEqual({
      page_location: `${origin}/integrated-report?lang=en&utm_source=kakao`,
      page_path: '/integrated-report?lang=en&utm_source=kakao',
    })
    expect(JSON.stringify(gtag.mock.calls)).not.toMatch(/1997|14:30|37\.5|Seoul|female/)
  })
})

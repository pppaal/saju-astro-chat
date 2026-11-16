/**
 * stripLocalePrefix — /ko 로케일 프리픽스를 벗겨 베어 경로로.
 *
 * proxy.ts 가 /ko/... 를 실제 라우트로 리라이트하지만 클라이언트 usePathname()
 * 은 브라우저 주소를 그대로 주므로, 헤더/푸터의 "홈인가 / 몰입형 라우트인가"
 * 판정은 이 함수를 거쳐야 한국어 URL 에서도 같은 결과가 난다.
 */
import { describe, it, expect } from 'vitest'
import { stripLocalePrefix } from '@/i18n/utils'

describe('stripLocalePrefix', () => {
  it('/ko 와 /ko/ 는 홈(/) 으로', () => {
    expect(stripLocalePrefix('/ko')).toBe('/')
    expect(stripLocalePrefix('/ko/')).toBe('/')
  })

  it('/ko/<path> 는 프리픽스만 벗긴다', () => {
    expect(stripLocalePrefix('/ko/blog')).toBe('/blog')
    expect(stripLocalePrefix('/ko/blog/some-post')).toBe('/blog/some-post')
    expect(stripLocalePrefix('/ko/compatibility/free')).toBe('/compatibility/free')
  })

  it('프리픽스가 아닌 경로는 그대로 둔다', () => {
    expect(stripLocalePrefix('/')).toBe('/')
    expect(stripLocalePrefix('/blog')).toBe('/blog')
    expect(stripLocalePrefix('/korea')).toBe('/korea')
    expect(stripLocalePrefix('/ko-fi')).toBe('/ko-fi')
    expect(stripLocalePrefix('/tarot/daily')).toBe('/tarot/daily')
  })

  it('빈 값(null/undefined/"") 은 홈(/) 으로 정규화한다', () => {
    expect(stripLocalePrefix(null)).toBe('/')
    expect(stripLocalePrefix(undefined)).toBe('/')
    expect(stripLocalePrefix('')).toBe('/')
  })

  it('멱등 — 두 번 적용해도 결과가 같다', () => {
    const once = stripLocalePrefix('/ko/blog')
    expect(stripLocalePrefix(once)).toBe(once)
  })
})

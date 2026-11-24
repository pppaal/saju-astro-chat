import { describe, it, expect } from 'vitest'
import {
  OWN_CHROME_ROUTES,
  isOwnChromeRoute,
  normalizePath,
  shouldShowBackButton,
  shouldShowFooter,
  shouldShowGlobalHeader,
  shouldShowStarfield,
} from '@/lib/routing/chromeRoutes'

type Chrome = { header: boolean; back: boolean; footer: boolean; stars: boolean }

const chromeFor = (pathname: string | null): Chrome => ({
  header: shouldShowGlobalHeader(pathname),
  back: shouldShowBackButton(pathname),
  footer: shouldShowFooter(pathname),
  stars: shouldShowStarfield(pathname),
})

const NONE: Chrome = { header: false, back: false, footer: false, stars: false }

describe('normalizePath', () => {
  it.each([
    [null, '/'],
    [undefined, '/'],
    ['', '/'],
    ['/', '/'],
    ['/ko', '/'],
    ['/ko/', '/'],
    ['/ko/destiny', '/destiny'],
    ['/ko/calendar/preview', '/calendar/preview'],
    ['/destiny/', '/destiny'],
    ['/korea', '/korea'], // only the /ko segment is a locale prefix
    ['/pricing', '/pricing'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePath(input)).toBe(expected)
  })
})

describe('OWN_CHROME_ROUTES (v9 paper screens)', () => {
  it('lists exact /, exact /destiny and the /calendar prefix', () => {
    expect(OWN_CHROME_ROUTES).toEqual([
      { path: '/', match: 'exact' },
      { path: '/destiny', match: 'exact' },
      { path: '/calendar', match: 'prefix' },
    ])
  })

  it.each([
    '/',
    '/ko',
    '/destiny',
    '/ko/destiny',
    '/calendar',
    '/calendar/preview',
    '/ko/calendar',
  ])('%s draws its own chrome (no global header, back button, footer or starfield)', (pathname) => {
    expect(isOwnChromeRoute(pathname)).toBe(true)
    expect(chromeFor(pathname)).toEqual(NONE)
  })

  it.each(['/destiny-counselor', '/ko/destiny-counselor', '/destinypal', '/integrated-report'])(
    '%s is not a v9 own-chrome route',
    (pathname) => {
      expect(isOwnChromeRoute(pathname)).toBe(false)
      expect(shouldShowStarfield(pathname)).toBe(true)
    }
  )
})

describe('current chrome is kept on every other route', () => {
  it.each<[string, Omit<Chrome, 'stars'>]>([
    // counselor: own header + back button, footer hidden (was covered by the old '/destiny' prefix)
    ['/destiny-counselor', { header: false, back: false, footer: false }],
    ['/ko/destiny-counselor', { header: false, back: false, footer: false }],
    // sub-route keeps the header (exact-match list) but hides back button + footer
    ['/destiny-counselor/chat', { header: true, back: false, footer: false }],
    ['/integrated-report', { header: true, back: true, footer: true }],
    ['/tarot', { header: false, back: false, footer: false }],
    ['/tarot/love/three-card', { header: true, back: false, footer: false }],
    ['/compatibility', { header: true, back: false, footer: false }],
    ['/compatibility/counselor', { header: false, back: false, footer: false }],
    ['/astrology/counselor', { header: false, back: true, footer: false }],
    ['/pricing', { header: true, back: false, footer: true }],
    ['/policy/terms', { header: true, back: false, footer: true }],
    ['/admin', { header: false, back: false, footer: true }],
    ['/admin/free-funnel', { header: false, back: false, footer: true }],
    ['/fortune', { header: true, back: true, footer: true }],
    ['/saju/ilju', { header: true, back: true, footer: true }],
  ])('%s', (pathname, expected) => {
    expect(chromeFor(pathname)).toEqual({ ...expected, stars: true })
  })

  it('applies the same rules under the /ko prefix', () => {
    for (const path of ['/tarot', '/pricing', '/integrated-report', '/admin', '/fortune']) {
      expect(chromeFor(`/ko${path}`)).toEqual(chromeFor(path))
    }
  })
})

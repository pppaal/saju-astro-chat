import { describe, it, expect } from 'vitest'
import {
  ANALYTICS_QUERY_ALLOWLIST,
  gaBootstrapScript,
  sanitizeAnalyticsUrl,
} from '@/lib/security/analyticsUrl'

const ORIGIN = 'https://destinypal.com'

/** 출생 정보가 든 실제 링크 모양(buildReportBirthQuery · buildCounselorHref · Life 리포트 링크). */
const BIRTH_URLS = [
  '/integrated-report?lang=en&date=1997-03-21&time=14:30&tu=0&lat=37.5665&lng=126.978&tz=Asia%2FSeoul&gender=female&name=Sam&place=Seoul',
  '/calendar?date=1997-03-21&time=14:30&lat=37.5665&lng=126.978&tz=Asia/Seoul&gender=female',
  '/destiny?date=1997-03-21&tu=1&gender=male&utm_source=kakao',
  '/destiny-counselor?birthDate=1997-03-21&birthTime=14:30&gender=F&city=Seoul&lat=37.5&lon=126.9&timeZone=Asia/Seoul&q=hello&lang=ko',
]
const BIRTH_VALUES =
  /1997|14:30|14%3A30|37\.5|126\.9|Seoul|female|Sam|gender|birth|date=|time=|lat=|lng=|lon=|tz=|q=/

/** 인라인 스크립트를 가짜 window/document 로 돌려 gtag 호출(dataLayer)을 모은다. */
function runBootstrap(href: string, referrer = '') {
  const url = new URL(href)
  const win = { location: { href: url.href, origin: url.origin, pathname: url.pathname } } as {
    location: { href: string; origin: string; pathname: string }
    dataLayer?: unknown[][]
  }
  const doc = { referrer }
  // 스크립트의 전역 참조(window · document · URL · URLSearchParams)만 주입한다.
  new Function('window', 'document', 'URL', 'URLSearchParams', gaBootstrapScript('G-TEST123'))(
    win,
    doc,
    URL,
    URLSearchParams
  )
  return (win.dataLayer ?? []).map((args) => Array.from(args as ArrayLike<unknown>))
}

describe('sanitizeAnalyticsUrl — GA 로 출생 정보를 보내지 않는다(QA-7, PMS-5)', () => {
  it.each(BIRTH_URLS)('출생 쿼리를 버린다: %s', (url) => {
    const out = sanitizeAnalyticsUrl(url, ORIGIN)
    expect(out).not.toBeNull()
    expect(out!.path).not.toMatch(BIRTH_VALUES)
    expect(out!.location).not.toMatch(BIRTH_VALUES)
  })

  it('허용 목록 키(utm_* · gclid · ref · lang)만 남기고 순서를 지킨다', () => {
    const out = sanitizeAnalyticsUrl(
      '/destiny?date=1997-03-21&utm_source=kakao&utm_medium=share&gender=male&utm_campaign=v9&utm_term=t&utm_content=c&gclid=abc&ref=friend&lang=ko&x=1',
      ORIGIN
    )
    expect(out).toEqual({
      path: '/destiny?utm_source=kakao&utm_medium=share&utm_campaign=v9&utm_term=t&utm_content=c&gclid=abc&ref=friend&lang=ko',
      location:
        'https://destinypal.com/destiny?utm_source=kakao&utm_medium=share&utm_campaign=v9&utm_term=t&utm_content=c&gclid=abc&ref=friend&lang=ko',
    })
    expect([...ANALYTICS_QUERY_ALLOWLIST]).toEqual([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'ref',
      'lang',
    ])
  })

  it('해시는 버리고, 쿼리가 다 빠지면 ? 도 붙이지 않는다', () => {
    expect(sanitizeAnalyticsUrl('/calendar?date=1997-03-21#day', ORIGIN)).toEqual({
      path: '/calendar',
      location: 'https://destinypal.com/calendar',
    })
    expect(sanitizeAnalyticsUrl('/', ORIGIN)).toEqual({
      path: '/',
      location: 'https://destinypal.com/',
    })
  })

  it('절대 URL(리퍼러)도 같은 규칙', () => {
    expect(
      sanitizeAnalyticsUrl('https://www.google.com/search?q=destinypal&utm_source=g', ORIGIN)
    ).toEqual({
      path: '/search?utm_source=g',
      location: 'https://www.google.com/search?utm_source=g',
    })
  })

  it('파싱이 안 되면 null', () => {
    expect(sanitizeAnalyticsUrl('/x', 'not a url')).toBeNull()
  })
})

describe('gaBootstrapScript — 첫 config 도 같은 규칙(인라인)', () => {
  it.each(BIRTH_URLS)('첫 page_location/page_path 에 출생 정보가 없다: %s', (url) => {
    const calls = runBootstrap(ORIGIN + url)
    const set = calls.find((c) => c[0] === 'set')?.[1] as Record<string, string>
    const config = calls.find((c) => c[0] === 'config')
    expect(config?.[1]).toBe('G-TEST123')
    const cfg = config?.[2] as Record<string, string>
    const expected = sanitizeAnalyticsUrl(url, ORIGIN)!
    // TS 정화와 인라인 정화가 같은 결과.
    expect(set).toEqual({ page_location: expected.location, page_path: expected.path })
    expect(cfg).toEqual({ page_path: expected.path, page_location: expected.location })
    expect(JSON.stringify(calls)).not.toMatch(/1997|14:30|37\.5|Seoul|female/)
  })

  it('같은 사이트 리퍼러의 출생 쿼리도 page_referrer 에서 빠진다', () => {
    const calls = runBootstrap(
      `${ORIGIN}/integrated-report?utm_source=x`,
      `${ORIGIN}/calendar?date=1997-03-21&time=14:30&lat=37.5665&lang=en`
    )
    const set = calls.find((c) => c[0] === 'set')?.[1] as Record<string, string>
    expect(set.page_referrer).toBe(`${ORIGIN}/calendar?lang=en`)
    expect(set.page_path).toBe('/integrated-report?utm_source=x')
  })

  it('리퍼러가 없으면 page_referrer 를 덮지 않는다', () => {
    const calls = runBootstrap(`${ORIGIN}/`)
    const set = calls.find((c) => c[0] === 'set')?.[1] as Record<string, string>
    expect('page_referrer' in set).toBe(false)
  })

  it('동의 갱신과 js 타임스탬프를 config 앞에 보낸다', () => {
    const kinds = runBootstrap(`${ORIGIN}/`).map((c) => c[0])
    expect(kinds).toEqual(['consent', 'js', 'set', 'config'])
  })

  it('GA ID 는 JSON 으로 싣는다(따옴표 주입 불가)', () => {
    expect(gaBootstrapScript("G-1');alert(1);//")).toContain(`"G-1');alert(1);//"`)
  })
})

// tests/lib/destiny/counselorRequest.test.ts
import { describe, it, expect } from 'vitest'
import { resolveCounselorLang, resolveUserTz } from '@/lib/destiny/counselorRequest'

// resolveCounselorLang 는 NextRequest.cookies 의 get() 만 쓴다 — 최소 stub.
function reqWithLocale(locale?: string) {
  return {
    cookies: {
      get: (name: string) =>
        name === 'locale' && locale !== undefined ? { name, value: locale } : undefined,
    },
  } as unknown as Parameters<typeof resolveCounselorLang>[1]
}

describe('resolveCounselorLang — 단일 출처 언어 도출', () => {
  it('body.lang 명시가 최우선 (쿠키 무시)', () => {
    expect(resolveCounselorLang({ lang: 'en' }, reqWithLocale('ko'))).toBe('en')
    expect(resolveCounselorLang({ lang: 'ko' }, reqWithLocale('en'))).toBe('ko')
  })

  it('body.lang 없으면 locale 쿠키 폴백', () => {
    expect(resolveCounselorLang({}, reqWithLocale('en'))).toBe('en')
    expect(resolveCounselorLang({}, reqWithLocale('ko'))).toBe('ko')
  })

  it('body.lang 도 쿠키도 없으면 ko', () => {
    expect(resolveCounselorLang({}, reqWithLocale(undefined))).toBe('ko')
    expect(resolveCounselorLang(null, reqWithLocale(undefined))).toBe('ko')
  })

  it('잘못된 body.lang 은 무시하고 쿠키/ko 로 폴백', () => {
    expect(resolveCounselorLang({ lang: 'fr' }, reqWithLocale('en'))).toBe('en')
    expect(resolveCounselorLang({ lang: 123 }, reqWithLocale(undefined))).toBe('ko')
  })

  it('realtime·warm 이 같은 입력에 같은 결과 — 캐시 키 드리프트 방지', () => {
    // 쿠키-EN 사용자가 body.lang 을 안 실어도 양쪽이 동일하게 en 으로 도출해야
    // warm/realtime 캐시 키가 일치한다(예전 warm 의 body-only 버그 회귀 가드).
    const body = { userTimezone: 'Asia/Seoul' }
    const req = reqWithLocale('en')
    expect(resolveCounselorLang(body, req)).toBe(resolveCounselorLang(body, req))
    expect(resolveCounselorLang(body, req)).toBe('en')
  })
})

describe('resolveUserTz — userTimezone > timezone > 서울', () => {
  it('userTimezone 우선', () => {
    expect(resolveUserTz({ userTimezone: 'America/New_York', timezone: 'Asia/Seoul' })).toBe(
      'America/New_York'
    )
  })
  it('userTimezone 없으면 timezone', () => {
    expect(resolveUserTz({ timezone: 'Europe/Paris' })).toBe('Europe/Paris')
  })
  it('둘 다 없으면 서울', () => {
    expect(resolveUserTz({})).toBe('Asia/Seoul')
  })
})

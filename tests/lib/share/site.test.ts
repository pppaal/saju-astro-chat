// tests/lib/share/site.test.ts
//
// 사이트 기본 URL·도메인 표기 SSOT — 공유 링크 URL(서버 라우트), OG 이미지와
// 공유 카드 PNG 의 도메인 글자가 모두 이 두 함수에서 나온다.

import { describe, it, expect, afterEach } from 'vitest'
import { siteBaseUrl, shareDomain } from '@/lib/share/site'

const prev = process.env.NEXT_PUBLIC_BASE_URL

afterEach(() => {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
  else process.env.NEXT_PUBLIC_BASE_URL = prev
})

describe('siteBaseUrl', () => {
  it('env 없으면 .com 폴백', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    expect(siteBaseUrl()).toBe('https://destinypal.com')
  })

  it('빈 문자열 env 도 폴백', () => {
    process.env.NEXT_PUBLIC_BASE_URL = ''
    expect(siteBaseUrl()).toBe('https://destinypal.com')
  })

  it('env 사용 + 끝 슬래시 제거', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://staging.example.com/'
    expect(siteBaseUrl()).toBe('https://staging.example.com')
  })

  it('끝 슬래시 없으면 그대로', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://x.io'
    expect(siteBaseUrl()).toBe('https://x.io')
  })
})

describe('shareDomain', () => {
  it('env 없으면 destinypal.com', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    expect(shareDomain()).toBe('destinypal.com')
  })

  it('스킴과 끝 슬래시를 뗀다', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://www.destinypal.com/'
    expect(shareDomain()).toBe('www.destinypal.com')
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
    expect(shareDomain()).toBe('localhost:3000')
  })
})

/**
 * 카카오 로그인 버튼 — provider 가 서버에 등록된 경우에만 노출되고,
 * 카카오 OAuth 는 인앱 웹뷰에서도 동작하므로 외부 브라우저 점프 없이
 * 바로 signIn('kakao') 를 호출해야 한다.
 *
 * getProviders 결과의 모듈 레벨 캐시 때문에 "kakao 있음" 시나리오는
 * GoogleLoginPanel.inapp.test.tsx(없음 시나리오)와 파일을 분리한다.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  getProviders: vi.fn(async () => ({
    google: { id: 'google', name: 'Google' },
    kakao: { id: 'kakao', name: 'Kakao' },
  })),
}))

import { signIn } from 'next-auth/react'

vi.mock('next/link', () => ({
  default: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>
  ),
}))

vi.mock('@/i18n/I18nProvider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useI18n: () => ({
    locale: 'ko',
    setLocale: vi.fn(),
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}))

import GoogleLoginPanel from '@/components/auth/GoogleLoginPanel'

const KAKAOTALK_UA =
  'Mozilla/5.0 (Linux; Android 13; SM-S908N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120 Mobile Safari/537.36 KAKAOTALK 10.5.6'

function setUserAgent(ua: string) {
  const original = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent')
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
  return () => {
    if (original) Object.defineProperty(window.navigator, 'userAgent', original)
  }
}

describe('GoogleLoginPanel — 카카오 버튼', () => {
  beforeEach(() => {
    cleanup()
    vi.mocked(signIn).mockClear()
  })
  afterEach(() => cleanup())

  it('provider 에 kakao 가 있으면 카카오 버튼이 노출된다', async () => {
    act(() => {
      render(<GoogleLoginPanel locale="ko" />)
    })
    expect(await screen.findByRole('button', { name: '카카오로 로그인' })).toBeInTheDocument()
  })

  it('동의 후 클릭하면 signIn("kakao") 를 호출한다', async () => {
    act(() => {
      render(<GoogleLoginPanel locale="ko" callbackUrl="/dashboard" />)
    })
    const kakaoBtn = await screen.findByRole('button', { name: '카카오로 로그인' })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(kakaoBtn)
    expect(signIn).toHaveBeenCalledWith('kakao', { callbackUrl: '/dashboard' })
  })

  it('카톡 인앱 웹뷰에서도 외부 점프 없이 카카오 로그인은 바로 진행된다', async () => {
    const restore = setUserAgent(KAKAOTALK_UA)
    try {
      act(() => {
        render(<GoogleLoginPanel locale="ko" callbackUrl="/dashboard" />)
      })
      const kakaoBtn = await screen.findByRole('button', { name: '카카오로 로그인' })
      fireEvent.click(screen.getByRole('checkbox'))
      fireEvent.click(kakaoBtn)
      // 구글이라면 kakaotalk://web/openExternal 로 점프했겠지만 카카오는 직행
      expect(signIn).toHaveBeenCalledWith('kakao', { callbackUrl: '/dashboard' })
    } finally {
      restore()
    }
  })

  it('동의 없이 클릭하면 로그인하지 않는다', async () => {
    act(() => {
      render(<GoogleLoginPanel locale="ko" />)
    })
    const kakaoBtn = await screen.findByRole('button', { name: '카카오로 로그인' })
    fireEvent.click(kakaoBtn)
    expect(signIn).not.toHaveBeenCalled()
  })
})

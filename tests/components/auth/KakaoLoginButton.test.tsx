/**
 * 카카오 로그인 버튼 — 잠정 숨김(HIDE_KAKAO_LOGIN, 2026-07 글로벌 포커스 전환).
 * provider(KAKAO_CLIENT_ID)가 서버에 등록돼 있어도 로그인 UI 에 카카오 버튼이
 * 노출되지 않아야 한다. 다시 켤 때(HIDE_KAKAO_LOGIN=false) 이 파일을 구버전
 * (노출 + signIn('kakao') 직행) 시나리오로 되돌린다 — git history 참조.
 *
 * getProviders 결과의 모듈 레벨 캐시 때문에 "kakao 있음" 시나리오는
 * GoogleLoginPanel.inapp.test.tsx(없음 시나리오)와 파일을 분리한다.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'

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

describe('GoogleLoginPanel — 카카오 버튼 숨김', () => {
  beforeEach(() => {
    cleanup()
    vi.mocked(signIn).mockClear()
  })
  afterEach(() => cleanup())

  it('provider 에 kakao 가 있어도 카카오 버튼이 노출되지 않는다 (잠정 숨김)', async () => {
    act(() => {
      render(<GoogleLoginPanel locale="ko" />)
    })
    // 구글 버튼은 정상 노출 — 로그인 자체가 깨진 게 아님을 함께 확인.
    expect(await screen.findByRole('button', { name: /Google/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '카카오로 로그인' })).not.toBeInTheDocument()
  })

  it('숨김 상태에선 어떤 경로로도 signIn("kakao") 가 불리지 않는다', async () => {
    act(() => {
      render(<GoogleLoginPanel locale="ko" callbackUrl="/dashboard" />)
    })
    await screen.findByRole('button', { name: /Google/i })
    expect(signIn).not.toHaveBeenCalledWith('kakao', expect.anything())
  })
})

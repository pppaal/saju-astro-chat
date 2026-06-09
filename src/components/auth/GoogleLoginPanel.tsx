'use client'

import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { isInAppBrowser } from '@/lib/auth/detectInAppBrowser'
import { openInExternalBrowser } from '@/lib/auth/openExternalBrowser'
import { isStandalonePWA } from '@/lib/auth/detectPWA'
import { useI18n } from '@/i18n/I18nProvider'
import { copyToClipboard } from '@/lib/utils/clipboard'

interface GoogleLoginPanelProps {
  locale: 'ko' | 'en'
  callbackUrl?: string
  // 드로어 안에서 약관 링크를 누르면 드로어를 닫기 위한 콜백
  onLinkNavigate?: () => void
  // signin 페이지에서 providers 가 아직 로딩 중이면 버튼만 disabled 처리
  providersReady?: boolean
  // signin 페이지에서 NextAuth 오류 query string 으로 들어왔을 때 표시
  errorMessage?: string
  // 외부 컨테이너에 추가 클래스가 필요한 경우
  className?: string
  // 패널 id (aria-controls 용)
  panelId?: string
  // 'dark' = 다크 배경(기본). 'light' = 흰 배경(예: premium-white 드로어).
  // light 일 때 흰 글자/연한 cyan 링크가 안 보이는 문제를 막기 위해 색 반전.
  variant?: 'dark' | 'light'
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

export default function GoogleLoginPanel({
  locale,
  callbackUrl = '/',
  onLinkNavigate,
  providersReady = true,
  errorMessage,
  className,
  panelId,
  variant = 'dark',
}: GoogleLoginPanelProps) {
  const isKo = locale === 'ko'
  const isLight = variant === 'light'
  const { t } = useI18n()
  const [agreed, setAgreed] = useState(false)
  // 동의 안 한 상태로 버튼 눌렀을 때만 빨갛게 강조. 사용자에게 "여기 눌러야 해요" 시각 안내.
  const [showWarn, setShowWarn] = useState(false)
  // In-app webviews (KakaoTalk, Naver, Instagram, ...) trigger Google's
  // `disallowed_useragent` 403 with no path back into our app. Detect on mount
  // and warn before the user ever taps "Continue with Google". Hydration-safe:
  // false during SSR, set on the first client effect.
  const [inApp, setInApp] = useState(false)
  // PWA standalone 모드 — OAuth callback 이 외부 브라우저로 빠지면 PWA 안
  // 으로 못 돌아옴. 사용자에게 미리 안내 + URL 복사 옵션 제공.
  const [pwa, setPwa] = useState(false)
  // iOS 인스타·페북 등 자동 점프 불가 케이스에서 "링크 복사됨" 피드백.
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    setInApp(isInAppBrowser())
    setPwa(isStandalonePWA())
  }, [])

  // 인앱 브라우저면 외부 브라우저로 점프시킨다. 카톡/안드로이드는 자동
  // 리다이렉트('redirected'), iOS 인스타/페북은 자동 불가라 링크 복사 +
  // 토스트로 안내('manual').
  const handleOpenExternal = () => {
    const result = openInExternalBrowser(callbackUrl)
    if (result === 'redirected') return
    void copyCurrentUrl()
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const handleSignIn = () => {
    if (!agreed) {
      setShowWarn(true)
      return
    }
    // 인앱 브라우저에서 구글 OAuth 는 막히므로(disallowed_useragent), 바로
    // signIn 을 호출하면 구글 에러 페이지에서 막다른 길에 빠진다. 그 대신
    // 외부 브라우저로 점프시켜 다른 사이트처럼 매끄럽게 로그인되게 한다.
    if (inApp) {
      handleOpenExternal()
      return
    }
    void signIn('google', { callbackUrl })
  }

  const copyCurrentUrl = async () => {
    if (typeof window === 'undefined') return
    // copyToClipboard handles HTTPS-only Clipboard API + execCommand fallback
    // for in-app webviews. Silent failure is fine — warning text already tells
    // users to long-press the address bar.
    await copyToClipboard(window.location.href)
  }

  // 경고 박스(인앱 브라우저 / PWA) — light 에서도 읽히도록 색 반전.
  const warnBoxClass = isLight
    ? 'rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800'
    : 'rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100'
  const warnSubClass = isLight ? 'mt-1 text-amber-700' : 'mt-1 text-amber-100/85'
  const warnBtnClass = isLight
    ? 'mt-2 inline-flex items-center rounded-md border border-amber-400/60 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100'
    : 'mt-2 inline-flex items-center rounded-md border border-amber-300/40 px-2 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-400/15'

  return (
    <div
      id={panelId}
      className={
        'flex flex-col gap-3 rounded-xl px-3.5 py-3 ' +
        (isLight ? 'bg-black/[0.03] ' : 'bg-white/[0.04] ') +
        (className ?? '')
      }
    >
      <p
        className={
          'text-[13px] font-medium ' + (isLight ? 'text-stone-800' : 'text-white/90')
        }
      >
        {isKo ? '로그인하고 계속하기' : 'Sign in to continue'}
      </p>

      {errorMessage && (
        <div
          className={
            'rounded-md px-3 py-2 text-[12px] ' +
            (isLight
              ? 'border border-red-300 bg-red-50 text-red-700'
              : 'border border-red-400/20 bg-red-500/10 text-red-200')
          }
        >
          {errorMessage}
        </div>
      )}

      {inApp && (
        <div data-testid="inapp-browser-warning" role="alert" className={warnBoxClass}>
          <p className="font-medium">
            {t('auth.inAppBrowserBlockedTitle', 'Google sign-in is blocked in this view.')}
          </p>
          <p className={warnSubClass}>
            {t(
              'auth.inAppBrowserBlockedGuide',
              'Open this page in Chrome or Safari (via the top-right menu → "Open in browser") to continue.'
            )}
          </p>
          <button type="button" onClick={handleOpenExternal} className={warnBtnClass}>
            {t('auth.openInBrowser', 'Open in browser')}
          </button>
          {copied && (
            <span className="ml-2 text-[11px] font-medium opacity-85">
              {t('common.copied', 'Copied')}
            </span>
          )}
        </div>
      )}

      {/* PWA (홈 화면 추가 앱) 사용자 — OAuth callback 이 외부 브라우저로
          빠지면 PWA 안으로 못 돌아오는 케이스가 있다. 미리 안내 + 브라우저
          에서 열기 옵션 제공. inApp 경고와 동시에 뜰 일은 거의 없음 (PWA
          는 보통 in-app webview 와 다른 컨텍스트). */}
      {pwa && !inApp && (
        <div data-testid="pwa-login-warning" role="alert" className={warnBoxClass}>
          <p className="font-medium">
            {t(
              'pwa.loginWarningTitle',
              'Google sign-in from the installed app may not return correctly.'
            )}
          </p>
          <p className={warnSubClass}>
            {t(
              'pwa.loginWarningGuide',
              'If sign-in fails, copy this link and open it in Chrome / Safari to log in. The session will carry back into the app.'
            )}
          </p>
          <button type="button" onClick={copyCurrentUrl} className={warnBtnClass}>
            {t('common.copyLink', 'Copy link')}
          </button>
        </div>
      )}

      {/* 동의 체크박스 — 버튼보다 위에 두어 사용자가 먼저 읽도록 함 */}
      <label
        className={`flex cursor-pointer select-none items-start gap-2.5 rounded-lg px-2 py-2 transition-colors ${
          showWarn && !agreed
            ? 'bg-rose-500/15 ring-1 ring-rose-400/60'
            : isLight
              ? 'hover:bg-black/[0.04]'
              : 'hover:bg-white/[0.04]'
        }`}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked)
            if (e.target.checked) setShowWarn(false)
          }}
          className="peer sr-only"
          aria-describedby={showWarn && !agreed ? 'consent-warn' : undefined}
        />
        <span
          aria-hidden="true"
          className={`mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-all peer-focus-visible:ring-2 ${
            isLight ? 'peer-focus-visible:ring-stone-500/60' : 'peer-focus-visible:ring-white/60'
          } ${
            agreed
              ? isLight
                ? 'border-stone-800 bg-stone-800'
                : 'border-white bg-white'
              : showWarn
                ? 'border-rose-300 bg-transparent'
                : isLight
                  ? 'border-stone-400 bg-transparent'
                  : 'border-white/70 bg-transparent'
          }`}
        >
          {agreed && (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden="true">
              <path
                d="M2.5 6.2 5 8.7l4.5-5"
                stroke={isLight ? '#ffffff' : '#0f172a'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span
          className={
            'text-[12px] leading-relaxed ' + (isLight ? 'text-stone-600' : 'text-white/85')
          }
        >
          {isKo ? '계속하면 ' : 'By continuing you agree to the '}
          <Link
            href="/policy/terms"
            onClick={onLinkNavigate}
            className={
              (isLight ? 'text-sky-700 underline' : 'text-cyan-300 hover:underline') +
              ' underline-offset-2'
            }
            target="_blank"
            rel="noreferrer"
          >
            {isKo ? '이용약관' : 'Terms'}
          </Link>
          {isKo ? ' 및 ' : ' and '}
          <Link
            href="/policy/privacy"
            onClick={onLinkNavigate}
            className={
              (isLight ? 'text-sky-700 underline' : 'text-cyan-300 hover:underline') +
              ' underline-offset-2'
            }
            target="_blank"
            rel="noreferrer"
          >
            {isKo ? '개인정보 처리방침' : 'Privacy'}
          </Link>
          {isKo ? '에 동의합니다.' : '.'}
        </span>
      </label>

      {showWarn && !agreed && (
        <p
          id="consent-warn"
          className={'-mt-1.5 px-1 text-[11px] ' + (isLight ? 'text-rose-600' : 'text-rose-300')}
        >
          {isKo
            ? '계속하려면 위 약관 동의에 체크해 주세요.'
            : 'Please check the consent box above to continue.'}
        </p>
      )}

      {/* Google 버튼 — disabled 외관 대신 항상 활성. 미동의 시 클릭하면 위 체크박스가
          빨갛게 강조되고 안내 텍스트가 뜨므로 사용자가 다음 행동을 즉시 알 수 있음. */}
      <button
        type="button"
        onClick={handleSignIn}
        disabled={!providersReady}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-white/95 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-slate-700"
      >
        <GoogleIcon />
        {isKo ? 'Google로 로그인' : 'Continue with Google'}
      </button>
    </div>
  )
}

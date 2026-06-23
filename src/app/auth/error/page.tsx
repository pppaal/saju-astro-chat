'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useI18n } from '@/i18n/I18nProvider'

// @auth/core 가 로그인 실패 시 ?error=<type> 으로 보내는 에러 페이지.
// 가장 흔한 type 은 "Configuration" — 진짜 설정 오류일 수도 있지만, OAuth
// 콜백 중 어댑터가 일시적 DB 실패로 throw 되면(서버리스 + Supabase 풀러
// 콜드/고갈) @auth/core 가 그걸 CallbackRouteError 로 감싸 무조건 이 type 으로
// 떨어뜨리기 때문에, 실사용에서는 "잠시 후 다시 시도하면 되는" 일시적
// 문제인 경우가 대부분이다. 그래서 Configuration 은 영구 장애처럼 보이지
// 않게 "잠시 후 다시 시도" 톤으로 안내한다.

interface ErrorCopy {
  title: { ko: string; en: string }
  body: { ko: string; en: string }
  /** 재시도가 의미 있는 일시적 오류인지 — 재시도 버튼 노출 여부. */
  retryable: boolean
}

const ERROR_COPY: Record<string, ErrorCopy> = {
  Configuration: {
    title: { ko: '잠시 문제가 있었어요', en: 'Something went wrong' },
    body: {
      ko: '일시적인 문제로 로그인을 마치지 못했어요. 잠시 후 다시 시도해 주세요. 계속 반복되면 잠깐 기다렸다가 다시 들어와 주세요.',
      en: 'We couldn’t finish signing you in due to a temporary issue. Please try again in a moment. If it keeps happening, wait a little and come back.',
    },
    retryable: true,
  },
  AccessDenied: {
    title: { ko: '접근이 거부되었어요', en: 'Access denied' },
    body: {
      ko: '이 계정으로는 로그인할 수 없어요. 다른 구글 계정으로 다시 시도해 주세요.',
      en: 'This account can’t sign in. Please try again with a different Google account.',
    },
    retryable: true,
  },
  Verification: {
    title: { ko: '링크가 만료되었어요', en: 'Link expired' },
    body: {
      ko: '인증 링크가 만료되었거나 이미 사용되었어요. 처음부터 다시 로그인해 주세요.',
      en: 'The sign-in link has expired or was already used. Please start the sign-in again.',
    },
    retryable: true,
  },
  OAuthAccountNotLinked: {
    title: { ko: '이미 가입된 이메일이에요', en: 'Email already in use' },
    body: {
      ko: '이 이메일은 이미 다른 방법으로 가입되어 있어요. 처음 가입할 때 쓰신 방법으로 로그인해 주세요.',
      en: 'This email is already registered with a different sign-in method. Please use the method you originally signed up with.',
    },
    retryable: true,
  },
  AccountNotLinked: {
    title: { ko: '이미 가입된 이메일이에요', en: 'Email already in use' },
    body: {
      ko: '이 이메일은 이미 다른 방법으로 가입되어 있어요. 처음 가입할 때 쓰신 방법으로 로그인해 주세요.',
      en: 'This email is already registered with a different sign-in method. Please use the method you originally signed up with.',
    },
    retryable: true,
  },
}

const DEFAULT_COPY: ErrorCopy = {
  title: { ko: '로그인에 실패했어요', en: 'Sign-in failed' },
  body: {
    ko: '로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    en: 'Something went wrong while signing you in. Please try again in a moment.',
  },
  retryable: true,
}

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const lang: 'ko' | 'en' = locale.toLowerCase().startsWith('ko') ? 'ko' : 'en'

  const errorParam = searchParams?.get('error') ?? ''
  const callbackUrl = searchParams?.get('callbackUrl') || '/'
  const copy = ERROR_COPY[errorParam] ?? DEFAULT_COPY

  const retryHref = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`

  return (
    <main className="flex min-h-[100svh] items-start justify-center bg-[#03060d] px-4 pt-24 text-slate-100 sm:pt-32">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-md">
        <h1 className="text-lg font-semibold text-slate-100">
          {t(`auth.errorPage.${errorParam}.title`, copy.title[lang])}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {t(`auth.errorPage.${errorParam}.body`, copy.body[lang])}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {copy.retryable && (
            <Link
              href={retryHref}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400"
            >
              {t('auth.errorPage.retry', lang === 'ko' ? '다시 로그인' : 'Try signing in again')}
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5"
          >
            {t('auth.errorPage.home', lang === 'ko' ? '홈으로' : 'Back home')}
          </Link>
        </div>

        {errorParam && (
          <p className="mt-5 text-center text-[11px] text-slate-600">
            {t('auth.errorPage.code', lang === 'ko' ? '오류 코드' : 'Error code')}: {errorParam}
          </p>
        )}
      </div>
    </main>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  )
}

'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'

type Providers = Awaited<ReturnType<typeof getProviders>>

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  )
}

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/'
  const error = searchParams?.get('error')
  const [providers, setProviders] = useState<Providers>(null)
  const [agreed, setAgreed] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    void getProviders().then(setProviders)
  }, [])

  return (
    <main className="min-h-[100svh] bg-[#03060d] text-slate-100 flex items-start justify-center px-4 pt-24 sm:pt-32">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-3 px-4 py-5 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md">
          <p className="text-[13px] font-medium text-white/90">
            {t('auth.signInToContinue', '로그인하고 계속하기')}
          </p>

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-400/20 px-3 py-2 text-[12px] text-red-200">
              {t('auth.error.default', '로그인 중 오류가 발생했어요. 다시 시도해 주세요.')}
            </div>
          )}

          <button
            type="button"
            disabled={!agreed || !providers?.google}
            onClick={() => {
              if (!agreed) return
              void signIn('google', { callbackUrl })
            }}
            className={`flex items-center justify-center gap-2 w-full px-3 py-2.5
              rounded-lg text-sm font-medium transition-colors
              ${
                agreed && providers?.google
                  ? 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer'
                  : 'bg-white/40 text-slate-700 cursor-not-allowed'
              }`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
            {t('auth.signInWithGoogle', 'Google로 로그인')}
          </button>

          <label className="flex items-start gap-2 text-[11px] leading-relaxed text-white/65">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 cursor-pointer"
            />
            <span>
              {t('auth.termsConsentPrefix', '계속하면 ')}
              <Link
                href="/policy/terms"
                className="text-cyan-300 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {t('auth.termsOfUse', '이용약관')}
              </Link>
              {t('auth.termsConsentJoin', ' 및 ')}
              <Link
                href="/policy/privacy"
                className="text-cyan-300 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {t('auth.privacyPolicy', '개인정보 처리방침')}
              </Link>
              {t('auth.termsConsentSuffix', '에 동의합니다.')}
            </span>
          </label>
        </div>
      </div>
    </main>
  )
}

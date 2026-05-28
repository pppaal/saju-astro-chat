'use client'

import { getProviders } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import GoogleLoginPanel from '@/components/auth/GoogleLoginPanel'

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
  const { t, locale } = useI18n()
  const normalizedLocale: 'ko' | 'en' = locale.toLowerCase().startsWith('ko') ? 'ko' : 'en'

  useEffect(() => {
    void getProviders().then(setProviders)
  }, [])

  const errorMessage = error
    ? t('auth.error.default', '로그인 중 오류가 발생했어요. 다시 시도해 주세요.')
    : undefined

  return (
    <main className="flex min-h-[100svh] items-start justify-center bg-[#03060d] px-4 pt-24 text-slate-100 sm:pt-32">
      <div className="w-full max-w-sm">
        <GoogleLoginPanel
          locale={normalizedLocale}
          callbackUrl={callbackUrl}
          providersReady={Boolean(providers?.google)}
          errorMessage={errorMessage}
          className="border border-white/10 backdrop-blur-md"
        />
      </div>
    </main>
  )
}

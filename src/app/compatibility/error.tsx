'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { useI18n } from '@/i18n/I18nProvider'

export default function CompatibilityError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { locale } = useI18n()
  const isKo = locale === 'ko'

  useEffect(() => {
    logger.error('Compatibility error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f4f1] p-4">
      <div className="max-w-md text-center" role="alert">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1
          className="mb-3 text-2xl font-bold text-[#1c1917]"
          style={{ fontFamily: 'var(--font-cinzel), Georgia, serif' }}
        >
          {isKo ? '궁합 오류' : 'Compatibility Error'}
        </h1>
        <p className="mb-6 text-[#57534e]">
          {isKo
            ? '궁합 분석을 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.'
            : 'Something went wrong loading the compatibility reading. Please try again.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-[#1c1917] px-6 py-2.5 text-white transition-colors hover:bg-[#3a3530]"
          >
            {isKo ? '다시 시도' : 'Try again'}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-[#e0ddd7] bg-white px-6 py-2.5 text-[#44403c] transition-colors hover:bg-[#faf9f7]"
          >
            {isKo ? '홈으로' : 'Home'}
          </Link>
        </div>
        {error.digest && <p className="mt-4 text-xs text-[#a8a29e]">Error ID: {error.digest}</p>}
      </div>
    </div>
  )
}

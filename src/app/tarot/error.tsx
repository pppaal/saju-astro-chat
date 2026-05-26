'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { useI18n } from '@/i18n/I18nProvider'

export default function TarotError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { locale } = useI18n()
  const isKo = locale === 'ko'

  useEffect(() => {
    logger.error('Tarot error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md" role="alert">
        <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">{isKo ? '타로 오류' : 'Tarot Error'}</h1>
        <p className="text-gray-400 mb-6">
          {isKo
            ? '타로 페이지를 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.'
            : 'Something went wrong loading the tarot page. Please try again.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
          >
            {isKo ? '다시 시도' : 'Try again'}
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            {isKo ? '홈으로' : 'Home'}
          </Link>
        </div>
        {error.digest && <p className="mt-4 text-xs text-gray-500">Error ID: {error.digest}</p>}
      </div>
    </div>
  )
}

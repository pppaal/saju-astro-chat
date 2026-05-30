'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorScreen } from '@/components/ui/ErrorScreen'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { locale } = useI18n()
  const isKo = locale === 'ko'

  useEffect(() => {
    logger.error('Route error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <ErrorScreen
      variant="dark"
      title={isKo ? '문제가 발생했어요' : 'Something went wrong'}
      message={
        isKo
          ? '예기치 못한 오류가 발생했어요. 다시 시도해 주세요.'
          : 'An unexpected error occurred. Please try again.'
      }
      primaryAction={{
        label: isKo ? '다시 시도' : 'Try again',
        onClick: reset,
      }}
      secondaryAction={{
        label: isKo ? '홈으로' : 'Home',
        href: '/',
      }}
      diagnosticId={error.digest}
    />
  )
}

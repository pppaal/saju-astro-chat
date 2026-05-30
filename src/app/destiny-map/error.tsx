'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorScreen } from '@/components/ui/ErrorScreen'

export default function DestinyMapError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { locale } = useI18n()
  const isKo = locale === 'ko'

  useEffect(() => {
    logger.error('Destiny Counselor error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <ErrorScreen
      variant="dark"
      title={isKo ? '운명 상담사 오류' : 'Destiny Counselor Error'}
      message={
        isKo
          ? '운명 상담사를 불러오는 중 오류가 발생했어요. 다시 시도해 주세요.'
          : 'Something went wrong loading Destiny Counselor. Please try again.'
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

'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorScreen } from '@/components/ui/ErrorScreen'

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { locale } = useI18n()
  const isKo = locale === 'ko'

  useEffect(() => {
    logger.error('Blog error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <ErrorScreen
      variant="dark"
      title={isKo ? '블로그 오류' : 'Something went wrong'}
      message={
        isKo
          ? '블로그를 불러오는 중 오류가 발생했어요. 다시 시도해 주세요.'
          : 'An error occurred while loading the blog. Please try again.'
      }
      primaryAction={{
        label: isKo ? '다시 시도' : 'Try Again',
        onClick: reset,
      }}
      secondaryAction={{
        label: isKo ? '블로그로' : 'Back to Blog',
        href: '/blog',
      }}
      diagnosticId={error.digest}
    />
  )
}

'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useStaleChunkReload } from '@/hooks/useStaleChunkReload'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorScreen } from '@/components/ui/ErrorScreen'

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const reloadingStaleChunk = useStaleChunkReload(error)
  const { locale } = useI18n()
  const isKo = locale === 'ko'

  useEffect(() => {
    logger.error('Blog error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  // 배포로 사라진 청크 에러 — 자동 리로드 1회로 복구 중. 에러 UI 깜빡임 방지.
  if (reloadingStaleChunk) {
    return <div className="min-h-[100svh]" aria-hidden="true" />
  }

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

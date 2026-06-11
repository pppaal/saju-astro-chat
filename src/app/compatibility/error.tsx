'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useStaleChunkReload } from '@/hooks/useStaleChunkReload'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorScreen } from '@/components/ui/ErrorScreen'

export default function CompatibilityError({
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
    logger.error('Compatibility error:', {
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
      variant="light"
      title={isKo ? '궁합 오류' : 'Compatibility Error'}
      message={
        isKo
          ? '궁합 분석을 불러오는 중 오류가 발생했어요. 다시 시도해 주세요.'
          : 'Something went wrong loading the compatibility reading. Please try again.'
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

'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useStaleChunkReload } from '@/hooks/useStaleChunkReload'
import { useI18n } from '@/i18n/I18nProvider'
import { ErrorScreen } from '@/components/ui/ErrorScreen'

// 캘린더(운흐름 5-tier) 라우트 에러 바운더리. 서버 컴포넌트가 본명 데이터로
// Swiss Ephemeris 빌드를 하다 throw 하면(예: 생년월일/시/좌표 불완전·손상),
// 이전엔 전역 에러페이지로 떨어졌다. 캘린더 전용 안내 + 프로필 점검 동선을 준다.
export default function CalendarError({
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
    logger.error('Calendar error:', {
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
      title={isKo ? '운흐름을 불러오지 못했어요' : "Couldn't load your timeline"}
      message={
        isKo
          ? '운흐름 캘린더를 계산하는 중 문제가 생겼어요. 생년월일·시간·태어난 곳이 정확히 입력됐는지 확인하고 다시 시도해 주세요.'
          : 'Something went wrong building your fortune timeline. Check that your birth date, time, and place are entered correctly, then try again.'
      }
      primaryAction={{
        label: isKo ? '다시 시도' : 'Try again',
        onClick: reset,
      }}
      secondaryAction={{
        label: isKo ? '프로필에서 본명 확인' : 'Check birth details',
        href: '/profile',
      }}
      diagnosticId={error.digest}
    />
  )
}

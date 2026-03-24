import { NextResponse } from 'next/server'
import { wrapError } from '@/lib/destiny-matrix'
import { HTTP_STATUS } from '@/lib/constants/http'

export function buildAiReportErrorResponse(error: unknown) {
  const rawErrorMessage = error instanceof Error ? error.message : String(error)

  if (rawErrorMessage.includes('No AI providers available')) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AI_NOT_CONFIGURED',
          message: 'AI 서비스가 설정되지 않았습니다. 관리자에게 문의하세요.',
        },
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }

  if (rawErrorMessage.includes('All AI providers failed') || rawErrorMessage.includes('API error')) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: 'AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        },
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }

  if (
    rawErrorMessage.includes('No JSON found in AI response') ||
    rawErrorMessage.includes('AI response JSON is malformed') ||
    rawErrorMessage.includes('AI response is empty')
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AI_RESPONSE_INVALID',
          message:
            'AI 응답 형식이 깨져 리포트 생성에 실패했습니다. 모델 설정이나 토큰 한도를 점검해 주세요.',
        },
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }

  if (
    rawErrorMessage.includes('prisma') ||
    rawErrorMessage.includes('Prisma') ||
    rawErrorMessage.includes('DATABASE_URL') ||
    rawErrorMessage.includes('destinyMatrixReport')
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REPORT_PERSIST_FAILED',
          message:
            '리포트 저장 단계에서 실패했습니다. 배포 DB 연결이나 마이그레이션 상태를 확인해 주세요.',
        },
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }

  if (
    rawErrorMessage.includes('aborted') ||
    rawErrorMessage.includes('timeout') ||
    rawErrorMessage.includes('AbortError')
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AI_TIMEOUT',
          message: 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        },
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }

  const wrappedError = wrapError(error)
  return NextResponse.json(wrappedError.toJSON(), {
    status: wrappedError.getHttpStatus(),
  })
}

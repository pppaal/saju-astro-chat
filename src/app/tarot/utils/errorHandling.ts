export type AnalyzeFallbackReason =
  | 'auth_failed'
  | 'rate_limited'
  | 'parse_failed'
  | 'no_candidate'
  | 'invalid_spread'
  | 'server_error'
  | 'network_error'

export function isAnalyzeFallbackReason(value: unknown): value is AnalyzeFallbackReason {
  return (
    value === 'auth_failed' ||
    value === 'rate_limited' ||
    value === 'parse_failed' ||
    value === 'no_candidate' ||
    value === 'invalid_spread' ||
    value === 'server_error' ||
    value === 'network_error'
  )
}

export function classifyAnalyzeFallbackReason(status?: number): AnalyzeFallbackReason {
  if (status === 401 || status === 403) return 'auth_failed'
  if (status === 429) return 'rate_limited'
  return 'server_error'
}

export function getAnalyzeFallbackNotice(reason: AnalyzeFallbackReason, isKo: boolean): string {
  const ko: Record<AnalyzeFallbackReason, string> = {
    auth_failed: 'AI 질문 분석이 잠시 불안정해 가장 가까운 경로로 먼저 연결했어요.',
    rate_limited: 'AI 질문 분석 요청이 몰려 가장 가까운 경로로 먼저 연결했어요.',
    parse_failed: 'AI 질문 분석 결과가 불안정해 가장 가까운 경로로 먼저 연결했어요.',
    no_candidate: '질문에 맞는 추천을 바로 고정하지 못해 가장 가까운 경로로 먼저 연결했어요.',
    invalid_spread: '추천 스프레드를 확정하지 못해 가장 가까운 경로로 먼저 연결했어요.',
    server_error: 'AI 질문 분석이 지연돼 가장 가까운 경로로 먼저 연결했어요.',
    network_error: '네트워크가 불안정해 가장 가까운 경로로 먼저 연결했어요.',
  }

  const en: Record<AnalyzeFallbackReason, string> = {
    auth_failed: 'AI question analysis was unstable, so the flow used the nearest route first.',
    rate_limited: 'AI question analysis is busy right now, so the flow used the nearest route first.',
    parse_failed: 'AI question analysis was unstable, so the flow used the nearest route first.',
    no_candidate: 'The question could not be locked to a single recommendation, so the nearest route was used first.',
    invalid_spread: 'The recommended spread could not be confirmed, so the nearest route was used first.',
    server_error: 'AI question analysis was delayed, so the nearest route was used first.',
    network_error: 'The network was unstable, so the nearest route was used first.',
  }

  return isKo ? ko[reason] : en[reason]
}

export type TarotDrawErrorCode =
  | 'credit_exhausted'
  | 'auth_failed'
  | 'guest_limit_reached'
  | 'server_error'

export interface TarotDrawError {
  code: TarotDrawErrorCode
  status: number
  message: string
}

function extractApiErrorMessage(errorData: unknown): string {
  if (!errorData || typeof errorData !== 'object') return ''
  const record = errorData as Record<string, unknown>
  const rawError = record.error
  if (typeof rawError === 'string') return rawError
  if (rawError && typeof rawError === 'object') {
    const nested = rawError as Record<string, unknown>
    if (typeof nested.message === 'string') return nested.message
  }
  if (typeof record.message === 'string') return record.message
  return ''
}

function extractApiErrorCode(errorData: unknown): string {
  if (!errorData || typeof errorData !== 'object') return ''
  const record = errorData as Record<string, unknown>
  return typeof record.code === 'string' ? record.code : ''
}

export function classifyTarotDrawError(
  status: number,
  errorData: unknown,
  isKo: boolean
): TarotDrawError {
  const detail = extractApiErrorMessage(errorData)
  const apiCode = extractApiErrorCode(errorData)

  if (status === 402) {
    return {
      code: 'credit_exhausted',
      status,
      message:
        detail ||
        (isKo
          ? '리딩 크레딧이 부족합니다. 충전 후 다시 시도해 주세요.'
          : 'Not enough reading credits. Please recharge and try again.'),
    }
  }

  if (status === 401 || status === 403) {
    if (apiCode === 'guest_limit_reached') {
      return {
        code: 'guest_limit_reached',
        status,
        message:
          detail ||
          (isKo
            ? '무료 1회 리딩을 이미 사용했습니다. 로그인하면 다음 리딩을 이어서 볼 수 있습니다.'
            : 'Your one free guest reading has already been used. Sign in to continue with another reading.'),
      }
    }

    return {
      code: 'auth_failed',
      status,
      message:
        detail ||
        (isKo
          ? '인증이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.'
          : 'Authentication is invalid or expired. Please sign in again.'),
    }
  }

  return {
    code: 'server_error',
    status,
    message:
      detail ||
      (isKo
        ? '카드 드로우 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        : 'A server error occurred while drawing cards. Please try again shortly.'),
  }
}

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
    auth_failed: '자동선택 인증이 실패해 quick fallback을 사용했어요.',
    rate_limited: '자동선택 요청이 많아 quick fallback을 사용했어요.',
    parse_failed: '자동선택 응답 파싱에 실패해 quick fallback을 사용했어요.',
    no_candidate: '자동선택 결과를 만들 수 없어 quick fallback을 사용했어요.',
    invalid_spread: '자동선택 결과가 유효하지 않아 quick fallback을 사용했어요.',
    server_error: '자동선택 서버 오류로 quick fallback을 사용했어요.',
    network_error: '네트워크 문제로 quick fallback을 사용했어요.',
  }

  const en: Record<AnalyzeFallbackReason, string> = {
    auth_failed: 'Auto selection auth failed; quick fallback was used.',
    rate_limited: 'Auto selection was rate-limited; quick fallback was used.',
    parse_failed: 'Auto selection response parse failed; quick fallback was used.',
    no_candidate: 'Auto selection returned no candidate; quick fallback was used.',
    invalid_spread: 'Auto selection returned invalid spread; quick fallback was used.',
    server_error: 'Auto selection server error; quick fallback was used.',
    network_error: 'Network issue on auto selection; quick fallback was used.',
  }

  return isKo ? ko[reason] : en[reason]
}

export type TarotDrawErrorCode = 'credit_exhausted' | 'auth_failed' | 'server_error'

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

export function classifyTarotDrawError(
  status: number,
  errorData: unknown,
  isKo: boolean
): TarotDrawError {
  const detail = extractApiErrorMessage(errorData)

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

import { describe, expect, it } from 'vitest'
import {
  classifyAnalyzeFallbackReason,
  classifyTarotDrawError,
  isAnalyzeFallbackReason,
} from '@/app/tarot/utils/errorHandling'

describe('tarot error handling utils', () => {
  it('maps 401 to auth_failed for analyze fallback reason', () => {
    expect(classifyAnalyzeFallbackReason(401)).toBe('auth_failed')
  })

  it('validates fallback reason values', () => {
    expect(isAnalyzeFallbackReason('no_candidate')).toBe(true)
    expect(isAnalyzeFallbackReason('not_a_reason')).toBe(false)
  })

  it('separates draw credit errors (402) from auth errors (401)', () => {
    const creditError = classifyTarotDrawError(402, { error: 'No credits' }, true)
    const authError = classifyTarotDrawError(401, { error: 'Unauthorized' }, true)

    expect(creditError.code).toBe('credit_exhausted')
    expect(authError.code).toBe('auth_failed')
    expect(creditError.code).not.toBe(authError.code)
  })
})

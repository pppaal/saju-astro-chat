import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isTransientDbError, withDbRetry } from '@/lib/db/retry'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('isTransientDbError', () => {
  it('flags pool checkout timeout', () => {
    expect(isTransientDbError(new Error('Timed out fetching a new connection from the pool'))).toBe(
      true
    )
    expect(isTransientDbError(new Error('unable to check out a connection'))).toBe(true)
  })

  it('flags Supabase/pg connection failures', () => {
    expect(isTransientDbError(new Error('Connection terminated unexpectedly'))).toBe(true)
    expect(isTransientDbError(new Error('sorry, too many clients already'))).toBe(true)
    expect(isTransientDbError(new Error('remaining connection slots are reserved'))).toBe(true)
    expect(isTransientDbError({ code: 'ECONNRESET' })).toBe(true)
    expect(isTransientDbError({ code: 'ETIMEDOUT' })).toBe(true)
  })

  it('reads transient marker from nested cause', () => {
    const wrapped = new Error('query failed', {
      cause: new Error('connection terminated unexpectedly'),
    })
    expect(isTransientDbError(wrapped)).toBe(true)
  })

  it('does NOT flag logic errors (unique violation, not-null, etc.)', () => {
    expect(isTransientDbError(new Error('Unique constraint failed on the fields: (`email`)'))).toBe(
      false
    )
    expect(isTransientDbError(new Error('null value in column violates not-null'))).toBe(false)
    expect(isTransientDbError(null)).toBe(false)
    expect(isTransientDbError(undefined)).toBe(false)
  })
})

describe('withDbRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withDbRetry(fn, { label: 'test' })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries transient failures then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connection terminated unexpectedly'))
      .mockResolvedValueOnce('recovered')
    const result = await withDbRetry(fn, { baseDelayMs: 1, retries: 2, label: 'test' })
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-transient errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Unique constraint failed'))
    await expect(withDbRetry(fn, { baseDelayMs: 1, label: 'test' })).rejects.toThrow(
      'Unique constraint failed'
    )
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('gives up after exhausting retries and rethrows the last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    await expect(withDbRetry(fn, { baseDelayMs: 1, retries: 2, label: 'test' })).rejects.toThrow(
      'ECONNRESET'
    )
    // 1 initial + 2 retries
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

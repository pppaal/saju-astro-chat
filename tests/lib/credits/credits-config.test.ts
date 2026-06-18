import { describe, it, expect } from 'vitest'

describe('Credits Module Exports', () => {
  it('should export initializeUserCredits function', async () => {
    const { initializeUserCredits } = await import('@/lib/credits')
    expect(typeof initializeUserCredits).toBe('function')
  })

  it('should export getUserCredits function', async () => {
    const { getUserCredits } = await import('@/lib/credits')
    expect(typeof getUserCredits).toBe('function')
  })

  it('should export getCreditBalance function', async () => {
    const { getCreditBalance } = await import('@/lib/credits')
    expect(typeof getCreditBalance).toBe('function')
  })

  it('should export canUseCredits function', async () => {
    const { canUseCredits } = await import('@/lib/credits')
    expect(typeof canUseCredits).toBe('function')
  })

  it('should export consumeCredits function', async () => {
    const { consumeCredits } = await import('@/lib/credits')
    expect(typeof consumeCredits).toBe('function')
  })

  it('should export addBonusCredits function', async () => {
    const { addBonusCredits } = await import('@/lib/credits')
    expect(typeof addBonusCredits).toBe('function')
  })

  it('should export canUseFeature function', async () => {
    const { canUseFeature } = await import('@/lib/credits')
    expect(typeof canUseFeature).toBe('function')
  })
})

describe('withCredits Exports', () => {
  it('should export checkAndConsumeCredits function', async () => {
    const { checkAndConsumeCredits } = await import('@/lib/credits')
    expect(typeof checkAndConsumeCredits).toBe('function')
  })

  it('should export checkCreditsOnly function', async () => {
    const { checkCreditsOnly } = await import('@/lib/credits')
    expect(typeof checkCreditsOnly).toBe('function')
  })

  it('should export creditErrorResponse function', async () => {
    const { creditErrorResponse } = await import('@/lib/credits')
    expect(typeof creditErrorResponse).toBe('function')
  })

  it('should export ensureUserCredits function', async () => {
    const { ensureUserCredits } = await import('@/lib/credits')
    expect(typeof ensureUserCredits).toBe('function')
  })
})

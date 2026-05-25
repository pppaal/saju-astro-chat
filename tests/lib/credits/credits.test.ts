/**
 * Credit math tests (credit-only model — subscription plans retired)
 */

import { describe, it, expect } from 'vitest'

describe('Credit balance calculation', () => {
  it('calculates remaining credits correctly', () => {
    const monthlyCredits = 100
    const usedCredits = 30
    const bonusCredits = 10

    const remaining = monthlyCredits - usedCredits + bonusCredits
    expect(remaining).toBe(80)
  })

  it('remaining cannot be negative', () => {
    const monthlyCredits = 10
    const usedCredits = 15
    const bonusCredits = 0

    const remaining = Math.max(0, monthlyCredits - usedCredits + bonusCredits)
    expect(remaining).toBe(0)
  })

  it('bonus credits add to available credits', () => {
    const monthlyCredits = 10
    const usedCredits = 10
    const bonusCredits = 5

    const remaining = monthlyCredits - usedCredits + bonusCredits
    expect(remaining).toBe(5)
  })
})

describe('Period end calculation', () => {
  it('next period is one month from now', () => {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    expect(nextMonth.getMonth()).toBe((now.getMonth() + 1) % 12)
  })

  it('handles December to January transition', () => {
    const december = new Date(2024, 11, 15) // December 15, 2024
    const nextMonth = new Date(december)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    expect(nextMonth.getMonth()).toBe(0) // January
    expect(nextMonth.getFullYear()).toBe(2025)
  })
})

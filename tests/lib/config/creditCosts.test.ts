/**
 * 크레딧 소모량 SSOT(config/creditCosts.ts) 계약 테스트.
 * 숫자를 바꾸는 건 정당한 정책 변경일 수 있지만, 이 테스트가 함께 바뀌어야
 * 한다 — 과금 위계(리딩 ≥ 채팅 턴, 대형 스프레드 > 소형)가 깨지는 실수와
 * tarotCreditCostFor 가 SSOT 와 어긋나는 드리프트를 잡는다.
 */
import { describe, it, expect } from 'vitest'
import { CREDIT_COSTS } from '@/lib/config/creditCosts'
import { tarotCreditCostFor } from '@/lib/tarot/tarot-spreads-data'

describe('CREDIT_COSTS (소모량 SSOT)', () => {
  it('2026-07 확정 정책 값', () => {
    expect(CREDIT_COSTS.tarotReading.small).toBe(1)
    expect(CREDIT_COSTS.tarotReading.large).toBe(2)
    expect(CREDIT_COSTS.tarotReading.largeSpreadMinCards).toBe(5)
    expect(CREDIT_COSTS.tarotFollowup).toBe(1)
    expect(CREDIT_COSTS.counselorTurn).toBe(1)
    expect(CREDIT_COSTS.compatibilityTurn).toBe(1)
    expect(CREDIT_COSTS.dailyTarot).toBe(0)
  })

  it('위계 불변식: 대형 스프레드 > 소형 ≥ 채팅 턴, 전부 음수 불가', () => {
    expect(CREDIT_COSTS.tarotReading.large).toBeGreaterThan(CREDIT_COSTS.tarotReading.small)
    expect(CREDIT_COSTS.tarotReading.small).toBeGreaterThanOrEqual(CREDIT_COSTS.counselorTurn)
    for (const v of [
      CREDIT_COSTS.tarotReading.small,
      CREDIT_COSTS.tarotReading.large,
      CREDIT_COSTS.tarotFollowup,
      CREDIT_COSTS.counselorTurn,
      CREDIT_COSTS.compatibilityTurn,
      CREDIT_COSTS.dailyTarot,
    ]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('tarotCreditCostFor 는 SSOT 값을 그대로 따른다', () => {
    expect(tarotCreditCostFor(1)).toBe(CREDIT_COSTS.tarotReading.small)
    expect(tarotCreditCostFor(3)).toBe(CREDIT_COSTS.tarotReading.small)
    expect(tarotCreditCostFor(CREDIT_COSTS.tarotReading.largeSpreadMinCards)).toBe(
      CREDIT_COSTS.tarotReading.large
    )
    expect(tarotCreditCostFor(7)).toBe(CREDIT_COSTS.tarotReading.large)
  })
})

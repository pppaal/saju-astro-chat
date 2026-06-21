/**
 * 타로 역방향 확률 SSOT — 세 추첨 경로(클래리파이어/일반/데일리)가 같은 값에서
 * 파생하는지 잠근다. 한 곳만 바꿔 나머지가 조용히 어긋나던 drift 방지.
 */
import { describe, it, expect } from 'vitest'
import {
  TAROT_REVERSED_PROBABILITY,
  TAROT_REVERSED_BYTE_THRESHOLD,
} from '@/lib/tarot/reversedProbability'

describe('TAROT_REVERSED_PROBABILITY', () => {
  it('통일된 15% 비율', () => {
    expect(TAROT_REVERSED_PROBABILITY).toBe(0.15)
  })

  it('데일리 결정적 추첨용 바이트 임계값은 확률에서 파생(byte<threshold)', () => {
    // 데일리는 해시 바이트(0-255) < threshold 면 역방향. 38/256 ≈ 0.1484.
    expect(TAROT_REVERSED_BYTE_THRESHOLD).toBe(Math.round(TAROT_REVERSED_PROBABILITY * 256))
    expect(TAROT_REVERSED_BYTE_THRESHOLD).toBe(38)
    // 환산 비율이 의도한 확률에서 ±0.01 이내 (반올림 오차 한도).
    expect(Math.abs(TAROT_REVERSED_BYTE_THRESHOLD / 256 - TAROT_REVERSED_PROBABILITY)).toBeLessThan(
      0.01
    )
  })
})

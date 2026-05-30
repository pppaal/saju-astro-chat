/**
 * 점성 transit 차트 timezone 정확성 회귀 (A2).
 *
 * 옛 버그: engine-core.ts 의 transit chart 호출이 `Date.UTC(userNow.year,...)`
 * 로 user-local wall-clock 을 UTC 로 잘못 해석 → transit JD 가 ±tzOffset 어긋남
 * (한국 사용자 9h → transit Moon ~5°, Sun ~0.4°).
 *
 * 수정: core/birthInstant.buildBirthInstant 로 정확한 UTC 변환.
 *
 * 검증: 같은 절대 순간에 다른 timezone 으로 호출 시 transit chart 가 동일해야 함
 * (절대 시각이 같으면 천체 위치는 한 가지).
 */

import { describe, it, expect } from 'vitest'
import { buildBirthInstant } from '@/lib/saju/core/birthInstant'

describe('transit chart 시각 변환 — A2 회귀', () => {
  it('같은 UTC 절대 순간 → buildBirthInstant 가 모든 timezone 입력에서 동일 instant 반환', () => {
    // KST 2026-05-30 23:00 = UTC 2026-05-30 14:00 = PST 2026-05-30 06:00 (PST=UTC-8).
    const kst = buildBirthInstant('2026-05-30', '23:00', 'Asia/Seoul')
    const utc = buildBirthInstant('2026-05-30', '14:00', 'UTC')
    expect(kst.toISOString()).toBe(utc.toISOString())
  })

  it('옛 코드의 잘못된 패턴 (Date.UTC + local) 과 새 코드 차이가 정확히 timezone offset', () => {
    // KST 23:00 의 wall-clock 을 Date.UTC 로 해석 (옛 버그) → UTC 23:00.
    const oldWrong = new Date(Date.UTC(2026, 4, 30, 23, 0)).toISOString()
    // 새 코드: KST 23:00 → 정확한 UTC 14:00.
    const correct = buildBirthInstant('2026-05-30', '23:00', 'Asia/Seoul').toISOString()
    // 차이가 정확히 9시간 (KST offset).
    const diffMs = new Date(oldWrong).getTime() - new Date(correct).getTime()
    expect(diffMs).toBe(9 * 60 * 60 * 1000)
  })
})

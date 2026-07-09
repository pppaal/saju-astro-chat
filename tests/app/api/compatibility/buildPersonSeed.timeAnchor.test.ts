/**
 * 궁합 buildPersonSeed — 시간 미상 정오 앵커(birthTimeAnchor SSOT) 위임 회귀.
 *
 * 회귀: 예전엔 시간 모름이 '00:00' 폴백으로 계산돼, 진태양시 보정(-32분)으로
 * LLM 컨텍스트의 일주가 전날 간지로 밀렸다(통합리포트·차트와 불일치). 이제
 * 빈 값 / '00:00'(폼 규약상 미상) / 명시 플래그(timeUnknown·birthTimeUnknown)
 * 전부 정오 앵커 + timeUnknown=true 로 수렴한다.
 */
import { describe, it, expect } from 'vitest'
import { buildPersonSeed } from '@/app/api/compatibility/counselor/routeSupport'
import { TIME_UNKNOWN_ANCHOR } from '@/lib/saju/birthTimeAnchor'

const BASE = { birthDate: '1992-03-15', gender: 'female', latitude: 37.5665, longitude: 126.978 }

describe('buildPersonSeed — 시간 미상 정오 앵커', () => {
  it("'00:00'(폼 규약상 미상)은 정오 앵커 + timeUnknown", () => {
    const seed = buildPersonSeed({ ...BASE, birthTime: '00:00' })
    expect(seed?.time).toBe(TIME_UNKNOWN_ANCHOR)
    expect(seed?.timeUnknown).toBe(true)
  })

  it('시각 필드 자체가 없어도 정오 앵커 + timeUnknown', () => {
    const seed = buildPersonSeed({ ...BASE })
    expect(seed?.time).toBe(TIME_UNKNOWN_ANCHOR)
    expect(seed?.timeUnknown).toBe(true)
  })

  it('명시 플래그(timeUnknown / birthTimeUnknown)는 시각이 있어도 미상 우선', () => {
    const a = buildPersonSeed({ ...BASE, birthTime: '08:30', timeUnknown: true })
    expect(a?.time).toBe(TIME_UNKNOWN_ANCHOR)
    expect(a?.timeUnknown).toBe(true)
    const b = buildPersonSeed({ ...BASE, birthTime: '08:30', birthTimeUnknown: true })
    expect(b?.time).toBe(TIME_UNKNOWN_ANCHOR)
    expect(b?.timeUnknown).toBe(true)
  })

  it('실제 시각은 그대로 (자정 직후 00:01 포함 — 미상으로 오인하지 않는다)', () => {
    const seed = buildPersonSeed({ ...BASE, birthTime: '23:30' })
    expect(seed?.time).toBe('23:30')
    expect(seed?.timeUnknown).toBe(false)
    const midnightish = buildPersonSeed({ ...BASE, birthTime: '00:01' })
    expect(midnightish?.time).toBe('00:01')
    expect(midnightish?.timeUnknown).toBe(false)
  })

  it('클라 필드명 변형(date/time)도 동일 처리', () => {
    const seed = buildPersonSeed({ date: '1992-03-15', time: '00:00', gender: 'M' })
    expect(seed?.time).toBe(TIME_UNKNOWN_ANCHOR)
    expect(seed?.timeUnknown).toBe(true)
  })

  it("tri-state: 명시 플래그 false + '00:00' 은 실제 자정 출생 — 자정 그대로 계산", () => {
    const seed = buildPersonSeed({ ...BASE, birthTime: '00:00', timeUnknown: false })
    expect(seed?.time).toBe('00:00')
    expect(seed?.timeUnknown).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { isMinorAge, minorSafeText, sanitizeCrossEntry } from '@/lib/calendar-engine/minorSafe'

describe('minorSafe', () => {
  it('isMinorAge — 만 19세 미만만 true', () => {
    expect(isMinorAge(12)).toBe(true)
    expect(isMinorAge(18)).toBe(true)
    expect(isMinorAge(19)).toBe(false)
    expect(isMinorAge(40)).toBe(false)
    expect(isMinorAge(undefined)).toBe(false)
  })

  it('ko — 성인 도메인 절을 연령 적합으로 치환', () => {
    const out = minorSafeText('정재 × 금성 — 안정된 결. 결혼·계약·구매에 우호.', 'ko')
    expect(out).not.toContain('결혼')
    expect(out).toContain('약속·계획·용돈 관리에 좋아요')
  })

  it('ko — 토큰 fallback (공직/투자/삼각관계/승진)', () => {
    expect(minorSafeText('공직 운', 'ko')).toBe('진로 운')
    expect(minorSafeText('투자 기회', 'ko')).toBe('계획 기회')
    expect(minorSafeText('삼각관계 주의', 'ko')).toBe('친구 사이 다툼 주의')
    expect(minorSafeText('승진 흐름', 'ko')).toBe('인정받는 일 흐름')
  })

  it('en — marriage/investment/love triangle 등 차단', () => {
    expect(minorSafeText('Favours marriage, contracts, and purchases.', 'en')).not.toMatch(
      /marriage/i
    )
    expect(minorSafeText('a love triangle looms', 'en')).not.toMatch(/love triangle/i)
    expect(minorSafeText('big investment ahead', 'en')).not.toMatch(/investment/i)
  })

  it('빈값/비-매칭은 그대로', () => {
    expect(minorSafeText('', 'ko')).toBe('')
    expect(minorSafeText(undefined, 'ko')).toBeUndefined()
    expect(minorSafeText('공부·취미에 좋은 날', 'ko')).toBe('공부·취미에 좋은 날')
  })

  it('sanitizeCrossEntry — ko/en 두 필드 in-place 정화', () => {
    const e: Record<string, unknown> = {
      meaning: '결혼·계약·구매에 우호',
      meaningEn: 'Favours marriage, contracts, and purchases',
    }
    sanitizeCrossEntry(e, 'meaning', 'meaningEn')
    expect(e.meaning).not.toContain('결혼')
    expect(e.meaningEn).not.toMatch(/marriage/i)
  })
})

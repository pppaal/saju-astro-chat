import { describe, it, expect } from 'vitest'
import {
  isMinorAge,
  minorSafeText,
  sanitizeCrossEntry,
  deepMinorSafe,
  minorSafeAll,
} from '@/lib/calendar-engine/minorSafe'

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
    expect(minorSafeText('Favors marriage, contracts, and purchases.', 'en')).not.toMatch(
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

  it('R3: 도박·코인·한탕·투기·배우자운 등 일/분야 카피 성인어 차단(감사 C3-hole)', () => {
    const money = minorSafeText('코인·도박 같은 한탕은 욕심이 화를 부릅니다.', 'ko')
    expect(money).not.toMatch(/도박|코인|한탕/)
    expect(minorSafeText('솔깃한 투자·한탕 제안', 'ko')).not.toMatch(/투자|한탕/)
    expect(minorSafeText('여성에겐 좋은 인연·배우자운이 강한 날', 'ko')).not.toMatch(/배우자/)
    expect(minorSafeText('투기만 한 박자 누르세요', 'ko')).not.toMatch(/투기/)
  })

  it('R3: en — gambling/betting/crypto/lottery 차단', () => {
    expect(minorSafeText('avoid gambling and betting today', 'en')).not.toMatch(/gambl|bett/i)
    expect(minorSafeText('a crypto coin windfall', 'en')).not.toMatch(/crypto|\bcoin/i)
    expect(minorSafeText('lottery luck', 'en')).not.toMatch(/lottery/i)
  })

  it('sanitizeCrossEntry — ko/en 두 필드 in-place 정화', () => {
    const e: Record<string, unknown> = {
      meaning: '결혼·계약·구매에 우호',
      meaningEn: 'Favors marriage, contracts, and purchases',
    }
    sanitizeCrossEntry(e, 'meaning', 'meaningEn')
    expect(e.meaning).not.toContain('결혼')
    expect(e.meaningEn).not.toMatch(/marriage/i)
  })

  it('deepMinorSafe — 중첩 객체·배열의 모든 문자열을 정화, ...En 키는 EN 어휘', () => {
    const src = {
      title: '결혼·계약·구매에 우호',
      titleEn: 'Favors marriage, contracts, and purchases',
      items: ['투자 기회', { line: '승진 흐름', lineEn: 'a promotion ahead' }],
      score: 72,
      flag: true,
      none: null,
    }
    const out = deepMinorSafe(src, false)
    expect(out.title).toBe('약속·계획·용돈 관리에 좋아요')
    expect(out.titleEn).toBe('Good for promises, plans, and pocket-money care')
    expect(out.items[0]).toBe('계획 기회')
    expect(out.items[1]).toEqual({ line: '인정받는 일 흐름', lineEn: 'a recognition ahead' })
    expect(out.score).toBe(72)
    expect(out.flag).toBe(true)
    expect(out.none).toBeNull()
    // 입력은 그대로(새 객체 반환)
    expect(src.title).toBe('결혼·계약·구매에 우호')
    expect(out).not.toBe(src)
  })

  it('deepMinorSafe — ...Ko 키는 EN 상위 아래에서도 KO 어휘, 그 외 키는 상위 언어 상속', () => {
    const out = deepMinorSafe(
      { tipEn: { body: 'big investment ahead', bodyKo: '투자 기회' }, plain: 'investment' },
      true
    )
    expect(out.tipEn.body).toBe('big plans ahead')
    expect(out.tipEn.bodyKo).toBe('계획 기회')
    expect(out.plain).toBe('plans')
  })

  it('minorSafeAll — isMinor=false 면 같은 참조 그대로, true 면 KO 기본으로 정화', () => {
    const src = { line: '결혼 이야기', lineEn: 'marriage talk' }
    expect(minorSafeAll(src, false)).toBe(src)
    expect(minorSafeAll(src, true)).toEqual({ line: '약속 이야기', lineEn: 'a promise talk' })
  })
})

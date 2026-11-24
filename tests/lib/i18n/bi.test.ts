import { describe, it, expect, expectTypeOf } from 'vitest'
import { pick, pickLocalized, type Bi, type Lang } from '@/lib/i18n/bi'

/**
 * 한/영 이중 문구 헬퍼 테스트.
 *  - pick: Bi 에서 lang 쪽 문구
 *  - pickLocalized: `x` / `xEn` 짝 필드에서 lang 쪽 값 (en 이 비면 ko 폴백)
 */

describe('i18n/bi', () => {
  describe('pick', () => {
    const bi: Bi = { ko: '오늘의 흐름', en: "Today's flow" }

    it('ko 면 한국어 문구', () => {
      expect(pick(bi, 'ko')).toBe('오늘의 흐름')
    })

    it('en 이면 영어 문구', () => {
      expect(pick(bi, 'en')).toBe("Today's flow")
    })
  })

  describe('pickLocalized', () => {
    interface Card {
      title: string
      titleEn?: string
      summary: string
      summaryEn: string | null
      count: number
    }
    const full: Card = {
      title: '전환',
      titleEn: 'Turn',
      summary: '요약',
      summaryEn: 'Summary',
      count: 3,
    }
    const koOnly: Card = { title: '전환', summary: '요약', summaryEn: null, count: 3 }

    it('ko 면 기본 필드를 그대로 쓴다 (xEn 이 있어도)', () => {
      expect(pickLocalized(full, 'title', 'ko')).toBe('전환')
      expect(pickLocalized(full, 'summary', 'ko')).toBe('요약')
    })

    it('en 이면 xEn 필드를 쓴다', () => {
      expect(pickLocalized(full, 'title', 'en')).toBe('Turn')
      expect(pickLocalized(full, 'summary', 'en')).toBe('Summary')
    })

    it('en 인데 xEn 이 undefined/null 이면 기본 필드로 폴백', () => {
      expect(pickLocalized(koOnly, 'title', 'en')).toBe('전환')
      expect(pickLocalized(koOnly, 'summary', 'en')).toBe('요약')
    })

    it('xEn 짝이 없는 필드는 lang 과 무관하게 기본값', () => {
      expect(pickLocalized(full, 'count', 'en')).toBe(3)
      expect(pickLocalized(full, 'count', 'ko')).toBe(3)
    })

    it('xEn 이 빈 문자열이면 그대로 돌려준다 (?? 폴백은 null/undefined 만)', () => {
      expect(pickLocalized({ title: '전환', titleEn: '' }, 'title', 'en')).toBe('')
    })

    it('반환 타입은 기본 필드 타입을 유지한다', () => {
      const lang = 'en' as Lang
      expectTypeOf(pickLocalized(full, 'title', lang)).toEqualTypeOf<string>()
      expectTypeOf(pickLocalized(full, 'summary', lang)).toEqualTypeOf<string>()
      expectTypeOf(pickLocalized(full, 'count', lang)).toEqualTypeOf<number>()
    })
  })
})

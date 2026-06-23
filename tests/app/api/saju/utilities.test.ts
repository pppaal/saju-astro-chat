import { describe, it, expect } from 'vitest'
import {
  isFiveElement,
  isTwelveStageType,
  asFiveElement,
  withYY,
  toBranch,
  pickLucky,
} from '@/app/api/saju/services/utilities'

describe('saju utilities', () => {
  describe('isFiveElement', () => {
    it('오행 한글이면 true', () => {
      expect(isFiveElement('목')).toBe(true)
      expect(isFiveElement('화')).toBe(true)
      expect(isFiveElement('토')).toBe(true)
      expect(isFiveElement('금')).toBe(true)
      expect(isFiveElement('수')).toBe(true)
    })

    it('아니면 false', () => {
      expect(isFiveElement('wood')).toBe(false)
      expect(isFiveElement('木')).toBe(false)
      expect(isFiveElement('')).toBe(false)
    })
  })

  describe('isTwelveStageType', () => {
    it('유효한 12운성 단계면 true', () => {
      expect(isTwelveStageType('장생')).toBe(true)
      expect(isTwelveStageType('제왕')).toBe(true)
      expect(isTwelveStageType('절')).toBe(true)
    })

    it('아니면 false', () => {
      expect(isTwelveStageType('xxx')).toBe(false)
      expect(isTwelveStageType('')).toBe(false)
    })
  })

  describe('asFiveElement', () => {
    it('목 계열', () => {
      expect(asFiveElement('목')).toBe('목')
      expect(asFiveElement('wood')).toBe('목')
      expect(asFiveElement('木')).toBe('목')
    })

    it('화 계열', () => {
      expect(asFiveElement('화')).toBe('화')
      expect(asFiveElement('fire')).toBe('화')
      expect(asFiveElement('火')).toBe('화')
    })

    it('토 계열', () => {
      expect(asFiveElement('토')).toBe('토')
      expect(asFiveElement('earth')).toBe('토')
      expect(asFiveElement('土')).toBe('토')
    })

    it('금 계열', () => {
      expect(asFiveElement('금')).toBe('금')
      expect(asFiveElement('metal')).toBe('금')
      expect(asFiveElement('金')).toBe('금')
    })

    it('수 계열', () => {
      expect(asFiveElement('수')).toBe('수')
      expect(asFiveElement('water')).toBe('수')
      expect(asFiveElement('水')).toBe('수')
    })

    it('알 수 없는 값은 토로 기본값', () => {
      expect(asFiveElement('unknown')).toBe('토')
      expect(asFiveElement('')).toBe('토')
    })
  })

  describe('withYY', () => {
    it('알려진 천간은 음양을 STEMS에서 조회', () => {
      expect(withYY({ name: '甲', element: '목' })).toEqual({
        name: '甲',
        element: '목',
        yin_yang: '양',
        sibsin: '',
      })
      expect(withYY({ name: '乙', element: '木' })).toEqual({
        name: '乙',
        element: '목',
        yin_yang: '음',
        sibsin: '',
      })
    })

    it('sibsin 보존', () => {
      const result = withYY({ name: '癸', element: 'water', sibsin: '비견' })
      expect(result.yin_yang).toBe('음')
      expect(result.element).toBe('수')
      expect(result.sibsin).toBe('비견')
    })

    it('알 수 없는 name은 양으로 기본값', () => {
      const result = withYY({ name: '없음', element: '목' })
      expect(result.yin_yang).toBe('양')
    })
  })

  describe('toBranch', () => {
    it('항상 양으로 설정하고 element 정규화', () => {
      expect(toBranch({ name: '子', element: 'water' })).toEqual({
        name: '子',
        element: '수',
        yin_yang: '양',
        sibsin: '',
      })
    })

    it('sibsin 보존', () => {
      expect(toBranch({ name: '午', element: '화', sibsin: '식신' }).sibsin).toBe('식신')
    })
  })

  describe('pickLucky', () => {
    const items = [
      { kind: '천을귀인', pillars: ['day', 'year'] },
      { kind: '도화', pillars: ['day'] },
      { kind: '역마', pillars: ['month'] },
      { kind: '비길운', pillars: ['day'] }, // not in LUCKY_SET
      { kind: '화개', pillars: ['day'] },
    ]

    it('해당 기둥의 길신만 추출하고 LUCKY_ORDER로 정렬', () => {
      const result = pickLucky(items, 'day')
      // expected order: 도화(0), 화개(1), 천을귀인(4)
      expect(result).toEqual(['도화', '화개', '천을귀인'])
    })

    it('LUCKY_SET에 없는 kind는 제외', () => {
      const result = pickLucky(items, 'day')
      expect(result).not.toContain('비길운')
    })

    it('다른 기둥 필터링', () => {
      expect(pickLucky(items, 'month')).toEqual(['역마'])
      expect(pickLucky(items, 'year')).toEqual(['천을귀인'])
      expect(pickLucky(items, 'time')).toEqual([])
    })

    it('중복 제거', () => {
      const dup = [
        { kind: '도화', pillars: ['day'] },
        { kind: '도화', pillars: ['day'] },
      ]
      expect(pickLucky(dup, 'day')).toEqual(['도화'])
    })

    it('빈 입력', () => {
      expect(pickLucky([], 'day')).toEqual([])
    })
  })
})

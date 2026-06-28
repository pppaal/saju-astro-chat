// tests/lib/destiny-map/calendar/utils.test.ts
import { describe, it, expect } from 'vitest'
import {
  isCheoneulGwiin,
  normalizeElement,
  isSamhapPartial,
  isSamhapFull,
  isChung,
  isXing,
  getJijanggan,
  getStemElement,
  getBranchElement,
} from '@/lib/calendar/utils'

describe('calendar utils', () => {
  describe('isCheoneulGwiin', () => {
    it('should return true for valid cheoneul gwiin combinations', () => {
      // 갑(甲)일간의 천을귀인은 축(丑)과 미(未)
      expect(isCheoneulGwiin('甲', '丑')).toBe(true)
      expect(isCheoneulGwiin('甲', '未')).toBe(true)
    })

    it('should return false for invalid combinations', () => {
      expect(isCheoneulGwiin('甲', '子')).toBe(false)
      expect(isCheoneulGwiin('甲', '寅')).toBe(false)
    })

    it('should return false for unknown stem', () => {
      expect(isCheoneulGwiin('X', '丑')).toBe(false)
    })
  })

  describe('normalizeElement', () => {
    it('should convert air to metal', () => {
      expect(normalizeElement('air')).toBe('metal')
    })

    it('should return other elements unchanged', () => {
      expect(normalizeElement('wood')).toBe('wood')
      expect(normalizeElement('fire')).toBe('fire')
      expect(normalizeElement('earth')).toBe('earth')
      expect(normalizeElement('metal')).toBe('metal')
      expect(normalizeElement('water')).toBe('water')
    })
  })

  describe('isSamhapPartial', () => {
    it('should return true for partial samhap (2 out of 3)', () => {
      // 수국삼합: 신(申)-자(子)-진(辰)
      expect(isSamhapPartial(['申', '子'])).toBe(true)
      expect(isSamhapPartial(['子', '辰'])).toBe(true)
      expect(isSamhapPartial(['申', '辰'])).toBe(true)
    })

    it('should return false for no samhap match', () => {
      expect(isSamhapPartial(['子', '丑'])).toBe(false)
      expect(isSamhapPartial(['寅', '丑'])).toBe(false)
    })

    it('should return true for full samhap', () => {
      expect(isSamhapPartial(['申', '子', '辰'])).toBe(true)
    })
  })

  describe('isSamhapFull', () => {
    it('should return element for full samhap', () => {
      // 수국삼합: 신(申)-자(子)-진(辰)
      expect(isSamhapFull(['申', '子', '辰'])).toBe('water')
      // 화국삼합: 인(寅)-오(午)-술(戌)
      expect(isSamhapFull(['寅', '午', '戌'])).toBe('fire')
      // 목국삼합: 해(亥)-묘(卯)-미(未)
      expect(isSamhapFull(['亥', '卯', '未'])).toBe('wood')
      // 금국삼합: 사(巳)-유(酉)-축(丑)
      expect(isSamhapFull(['巳', '酉', '丑'])).toBe('metal')
    })

    it('should return null for partial samhap', () => {
      expect(isSamhapFull(['申', '子'])).toBeNull()
      expect(isSamhapFull(['申', '子', '丑'])).toBeNull()
    })

    it('should return null for no samhap', () => {
      expect(isSamhapFull(['子', '丑', '寅'])).toBeNull()
    })
  })

  describe('isChung', () => {
    it('should return true for chung pairs', () => {
      // 충: 자오(子午), 축미(丑未), 인신(寅申), 묘유(卯酉), 진술(辰戌), 사해(巳亥)
      expect(isChung('子', '午')).toBe(true)
      expect(isChung('午', '子')).toBe(true)
      expect(isChung('丑', '未')).toBe(true)
      expect(isChung('寅', '申')).toBe(true)
    })

    it('should return false for non-chung pairs', () => {
      expect(isChung('子', '丑')).toBe(false)
      expect(isChung('子', '子')).toBe(false)
    })
  })

  describe('isXing', () => {
    it('should return true for xing pairs', () => {
      // 형: 인사(寅巳), 사신(巳申), 인신(寅申) 등
      expect(isXing('寅', '巳')).toBe(true)
      expect(isXing('巳', '申')).toBe(true)
    })

    it('should return false for non-xing pairs', () => {
      expect(isXing('子', '丑')).toBe(false)
    })

    it('should return false for unknown branch', () => {
      expect(isXing('X', 'Y')).toBe(false)
    })
  })

  describe('getJijanggan', () => {
    it('should return array of jijanggan for valid branch', () => {
      const result = getJijanggan('子')
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should return empty array for unknown branch', () => {
      const result = getJijanggan('X')
      expect(result).toEqual([])
    })

    it('should return proper jijanggan for 寅 (인)', () => {
      const result = getJijanggan('寅')
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('getStemElement', () => {
    it('should return correct element for stems', () => {
      // 갑을 = 목, 병정 = 화, 무기 = 토, 경신 = 금, 임계 = 수
      expect(getStemElement('甲')).toBe('wood')
      expect(getStemElement('乙')).toBe('wood')
      expect(getStemElement('丙')).toBe('fire')
      expect(getStemElement('丁')).toBe('fire')
      expect(getStemElement('戊')).toBe('earth')
      expect(getStemElement('己')).toBe('earth')
      expect(getStemElement('庚')).toBe('metal')
      expect(getStemElement('辛')).toBe('metal')
      expect(getStemElement('壬')).toBe('water')
      expect(getStemElement('癸')).toBe('water')
    })

    it('should return empty string for unknown stem', () => {
      expect(getStemElement('X')).toBe('')
    })
  })

  describe('getBranchElement', () => {
    it('should return correct element for branches', () => {
      // 인묘 = 목, 사오 = 화, 신유 = 금, 해자 = 수, 진술축미 = 토
      expect(getBranchElement('寅')).toBe('wood')
      expect(getBranchElement('卯')).toBe('wood')
      expect(getBranchElement('巳')).toBe('fire')
      expect(getBranchElement('午')).toBe('fire')
      expect(getBranchElement('申')).toBe('metal')
      expect(getBranchElement('酉')).toBe('metal')
      expect(getBranchElement('亥')).toBe('water')
      expect(getBranchElement('子')).toBe('water')
      expect(getBranchElement('辰')).toBe('earth')
      expect(getBranchElement('戌')).toBe('earth')
      expect(getBranchElement('丑')).toBe('earth')
      expect(getBranchElement('未')).toBe('earth')
    })

    it('should return empty string for unknown branch', () => {
      expect(getBranchElement('X')).toBe('')
    })
  })
})

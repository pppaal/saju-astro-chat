import { describe, it, expect } from 'vitest'
import { ganjiToKorean, STEM_KO, BRANCH_KO } from '@/lib/saju/ganjiKo'

describe('ganjiToKorean', () => {
  it('converts stem+branch hanja pillars to Korean reading', () => {
    expect(ganjiToKorean('辛未')).toBe('신미')
    expect(ganjiToKorean('甲戌')).toBe('갑술')
    expect(ganjiToKorean('丙午')).toBe('병오')
    expect(ganjiToKorean('癸亥')).toBe('계해')
  })

  it('converts branch pairs (충/합 표기) to Korean', () => {
    expect(ganjiToKorean('子午')).toBe('자오')
    expect(ganjiToKorean('寅申')).toBe('인신')
  })

  it('leaves already-Korean or unknown characters untouched', () => {
    expect(ganjiToKorean('갑자')).toBe('갑자')
    expect(ganjiToKorean('일주')).toBe('일주')
    expect(ganjiToKorean('辛未 일주')).toBe('신미 일주')
  })

  it('handles empty / nullish input', () => {
    expect(ganjiToKorean('')).toBe('')
    expect(ganjiToKorean(null)).toBe('')
    expect(ganjiToKorean(undefined)).toBe('')
  })

  it('covers all 10 stems and 12 branches', () => {
    expect(Object.keys(STEM_KO)).toHaveLength(10)
    expect(Object.keys(BRANCH_KO)).toHaveLength(12)
    // every mapped value is a single Hangul syllable
    for (const v of [...Object.values(STEM_KO), ...Object.values(BRANCH_KO)]) {
      expect(v).toMatch(/^[가-힣]$/)
    }
  })
})

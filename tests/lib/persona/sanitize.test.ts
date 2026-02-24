import { describe, expect, it } from 'vitest'
import { sanitizePersonaPayload, sanitizePersonaText } from '@/lib/persona/sanitize'

describe('sanitizePersonaText', () => {
  it('removes emoji surrogate pairs and escaped surrogate sequences', () => {
    const input = '테스트 \\uD83D\\uDCAA 문장 😀'
    const result = sanitizePersonaText(input)
    expect(result).toBe('테스트  문장')
  })

  it('normalizes line breaks and preserves meaningful newlines', () => {
    const input = '첫 줄\r\n둘째 줄\r셋째 줄'
    const result = sanitizePersonaText(input)
    expect(result).toBe('첫 줄\n둘째 줄\n셋째 줄')
  })

  it('removes control characters and keeps special punctuation', () => {
    const input = 'A\x00B\x07C !@#$%^&*()'
    const result = sanitizePersonaText(input)
    expect(result).toBe('ABC !@#$%^&*()')
  })

  it('repairs UTF-8 mojibake into readable Korean when possible', () => {
    const input = '\xEC\x95\x88\xEB\x85\x95\xED\x95\x98\xEC\x84\xB8\xEC\x9A\x94'
    const result = sanitizePersonaText(input)
    expect(result).toBe('안녕하세요')
  })

  it('keeps clean Korean text unchanged', () => {
    const input = '오늘의 행동 계획을 확인해보세요.'
    const result = sanitizePersonaText(input)
    expect(result).toBe(input)
  })
})

describe('sanitizePersonaPayload', () => {
  it('sanitizes nested object strings recursively', () => {
    const input = {
      title: '결과 \\uD83D\\uDCE4',
      lines: ['하나\x00', '둘😀'],
    }
    const result = sanitizePersonaPayload(input)
    expect(result).toEqual({
      title: '결과',
      lines: ['하나', '둘'],
    })
  })
})

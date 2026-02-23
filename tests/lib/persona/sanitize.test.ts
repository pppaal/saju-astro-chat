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

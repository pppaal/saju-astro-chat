import { describe, it, expect } from 'vitest'
import { isSelfHarm, crisisMessage, SELF_HARM_KEYWORDS } from '@/lib/safety/crisis'

describe('safety/crisis', () => {
  describe('isSelfHarm', () => {
    it('detects English self-harm phrasing', () => {
      expect(isSelfHarm('I want to kill myself')).toBe(true)
      expect(isSelfHarm('thinking about suicide')).toBe(true)
      expect(isSelfHarm('I want to die')).toBe(true)
      expect(isSelfHarm('self-harm thoughts')).toBe(true)
    })

    it('detects Korean self-harm phrasing (the gap the old English-only guard missed)', () => {
      expect(isSelfHarm('죽고 싶어요')).toBe(true)
      expect(isSelfHarm('그냥 사라지고 싶다')).toBe(true)
      expect(isSelfHarm('자해를 했어')).toBe(true)
      expect(isSelfHarm('살기 싫어')).toBe(true)
    })

    it('detects no-space / colloquial Korean phrasings (whitespace-normalized)', () => {
      expect(isSelfHarm('죽고싶어요')).toBe(true) // no space
      expect(isSelfHarm('죽고 싶어')).toBe(true)
      expect(isSelfHarm('사라지고싶다')).toBe(true) // no space
      expect(isSelfHarm('목숨을 끊고')).toBe(true)
      expect(isSelfHarm('이제 없어지고 싶어')).toBe(true)
    })

    it('detects additional English crisis phrasings', () => {
      expect(isSelfHarm("don't want to live")).toBe(true)
      expect(isSelfHarm('I want to end it all')).toBe(true)
      expect(isSelfHarm('just kill me')).toBe(true)
    })

    it('is case-insensitive', () => {
      expect(isSelfHarm('SUICIDE')).toBe(true)
      expect(isSelfHarm('Kill Myself')).toBe(true)
    })

    it('does not flag ordinary fortune questions', () => {
      expect(isSelfHarm('내 연애운 어때?')).toBe(false)
      expect(isSelfHarm('Will I get a promotion this year?')).toBe(false)
      expect(isSelfHarm('우리 궁합 좋아?')).toBe(false)
      expect(isSelfHarm('주식운 좋아?')).toBe(false)
    })

    it('does not flag benign idioms containing 목숨 (no longer a bare keyword)', () => {
      expect(isSelfHarm('목숨 걸고 응원해')).toBe(false)
      expect(isSelfHarm('목숨 걸고 열심히 할게')).toBe(false)
    })

    it('handles empty / nullish input', () => {
      expect(isSelfHarm('')).toBe(false)
      // @ts-expect-error runtime guard for nullish
      expect(isSelfHarm(undefined)).toBe(false)
    })
  })

  describe('crisisMessage', () => {
    it('returns Korean message with the 1393 hotline for ko locale', () => {
      const msg = crisisMessage('ko')
      expect(msg).toContain('1393')
      expect(msg.length).toBeGreaterThan(20)
    })

    it('returns English message with 988/1393 hotlines for non-ko locale', () => {
      const msg = crisisMessage('en')
      expect(msg).toContain('988')
      expect(msg).toContain('1393')
    })

    it('defaults to English for unknown/empty locale', () => {
      expect(crisisMessage('')).toContain('988')
      expect(crisisMessage('fr')).toContain('988')
    })
  })

  it('keyword list is non-empty and bilingual', () => {
    expect(SELF_HARM_KEYWORDS.length).toBeGreaterThan(10)
    expect(SELF_HARM_KEYWORDS).toContain('suicide')
    expect(SELF_HARM_KEYWORDS).toContain('자살')
  })
})

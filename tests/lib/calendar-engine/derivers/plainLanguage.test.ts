import { describe, it, expect } from 'vitest'
import {
  sibsinArea,
  twelveStagePlain,
  relationPlain,
  SCALE_TERM_PLAIN,
} from '@/lib/calendar-engine/derivers/plainLanguage'
describe('plainLanguage', () => {
  it('translates terms to everyday Korean', () => {
    expect(sibsinArea('정재')).toBe('돈·안정')
    expect(sibsinArea('정관')).toBe('일·책임')
    expect(twelveStagePlain('관대')).toContain('자리를 잡')
    expect(relationPlain('卯戌육합')).toBe('서로 잘 맞물려요')
    expect(relationPlain('寅申충')).toBe('부딪혀 흔들려요')
    expect(SCALE_TERM_PLAIN['대운']).toContain('10년')
    expect(sibsinArea('없는것')).toBe('없는것') // graceful
  })
})

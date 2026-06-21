import { describe, it, expect } from 'vitest'
import {
  sibsinArea,
  sibsinAreaEn,
  twelveStagePlain,
} from '@/lib/calendar-engine/derivers/plainLanguage'
describe('plainLanguage', () => {
  it('translates terms to everyday Korean', () => {
    expect(sibsinArea('정재')).toBe('돈·안정')
    expect(sibsinArea('정관')).toBe('일·책임')
    expect(twelveStagePlain('관대')).toContain('자리를 잡')
    expect(sibsinArea('없는것')).toBe('없는것') // graceful
  })
})

describe('plainLanguage — uncovered branches', () => {
  it('sibsinArea(undefined) → 빈 문자열', () => {
    expect(sibsinArea(undefined)).toBe('')
  })

  it('sibsinAreaEn: 십신 → 영문 생활영역, 묶음별 포함', () => {
    expect(sibsinAreaEn('정재')).toBe('steady wealth')
    expect(sibsinAreaEn('편관')).toBe('challenge & pressure')
    expect(sibsinAreaEn('재성')).toBe('money & results')
  })

  it('sibsinAreaEn: 모르는 십신은 원어 그대로, undefined 는 빈 문자열', () => {
    expect(sibsinAreaEn('없는것')).toBe('없는것')
    expect(sibsinAreaEn(undefined)).toBe('')
    expect(sibsinAreaEn()).toBe('')
  })

  it('twelveStagePlain: 모든 12운성 단계가 한 줄 뜻으로 풀린다', () => {
    expect(twelveStagePlain('장생')).toContain('새싹')
    expect(twelveStagePlain('제왕')).toContain('절정')
    expect(twelveStagePlain('절')).toContain('비워')
    expect(twelveStagePlain('태')).toContain('잉태')
  })

  it('twelveStagePlain: undefined → 빈 문자열, 모르는 단계는 원어', () => {
    expect(twelveStagePlain(undefined)).toBe('')
    expect(twelveStagePlain('없는단계')).toBe('없는단계')
  })
})

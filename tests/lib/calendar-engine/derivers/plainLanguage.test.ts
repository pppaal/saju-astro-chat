import { describe, it, expect } from 'vitest'
import {
  sibsinArea,
  sibsinAreaEn,
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

  it('relationPlain: 모든 관계 종류가 라벨 안에서 검출된다', () => {
    expect(relationPlain('巳申삼합')).toContain('한 방향')
    expect(relationPlain('寅卯辰방합')).toContain('계절')
    expect(relationPlain('丑戌未형')).toContain('갈등')
    expect(relationPlain('卯午파')).toContain('어긋')
    expect(relationPlain('子未해')).toContain('거슬')
    expect(relationPlain('子未원진')).toContain('안 맞')
    expect(relationPlain('공망')).toContain('비어')
  })

  it('relationPlain: undefined / 매칭 없는 라벨 → 빈 문자열', () => {
    expect(relationPlain(undefined)).toBe('')
    expect(relationPlain('아무관계없음')).toBe('')
  })

  it('SCALE_TERM_PLAIN: 시간 축·구조 용어 정의를 모두 노출', () => {
    expect(SCALE_TERM_PLAIN['세운']).toContain('해')
    expect(SCALE_TERM_PLAIN['프로펙션']).toContain('점성')
    expect(SCALE_TERM_PLAIN['용신']).toContain('보약')
    expect(SCALE_TERM_PLAIN['기신']).toContain('부담')
  })
})

import { describe, it, expect } from 'vitest'
import {
  sibsinArea,
  sibsinAreaEn,
  twelveStagePlain,
  splitPairName,
  plainPairName,
} from '@/lib/calendar-engine/derivers/plainLanguage'
describe('plainLanguage', () => {
  it('translates terms to everyday Korean', () => {
    expect(sibsinArea('정재')).toBe('돈·안정')
    expect(sibsinArea('정관')).toBe('일·책임')
    // 2026-07 생활어 정비 — 시적 은유 대신 행동 프레임.
    expect(twelveStagePlain('관대')).toContain('나서기')
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
    // 2026-07 생활어 정비 — 시적 은유("새싹") 대신 행동 프레임("벌이기").
    expect(twelveStagePlain('장생')).toContain('시작')
    expect(twelveStagePlain('제왕')).toContain('절정')
    expect(twelveStagePlain('절')).toContain('비우')
    expect(twelveStagePlain('태')).toContain('잉태')
  })

  it('twelveStagePlain: undefined → 빈 문자열, 모르는 단계는 원어', () => {
    expect(twelveStagePlain(undefined)).toBe('')
    expect(twelveStagePlain('없는단계')).toBe('없는단계')
  })

  it('splitPairName: "X × Y" 페어만 분해, 그 외엔 null', () => {
    expect(splitPairName('편관 × 화성')).toEqual({ saju: '편관', astro: '화성' })
    expect(splitPairName('정재 × Venus')).toEqual({ saju: '정재', astro: 'Venus' })
    expect(splitPairName('단일')).toBeNull()
    expect(splitPairName('a × b × c')).toBeNull()
    expect(splitPairName(undefined)).toBeNull()
    expect(splitPairName('× 화성')).toBeNull()
  })

  it('plainPairName: 교차 페어를 생활영역 × 일상어로 (ko/en, 한글 누수 없음)', () => {
    // 십신 × 한글 행성
    expect(plainPairName('편관 × 화성', true)).toBe('일·도전 × 추진·마찰')
    expect(plainPairName('편관 × 화성', false)).toBe('challenge & pressure × drive & friction')
    // 영문 행성 혼용도 동일하게 풀린다
    expect(plainPairName('정재 × Venus', true)).toBe('돈·안정 × 사랑·돈')
    expect(plainPairName('정재 × Venus', false)).toBe('steady wealth × love & money')
    // 영문 출력엔 한글 누수 없음
    expect(plainPairName('정관 × 토성', false)).not.toMatch(/[가-힣]/)
  })

  it('plainPairName: 페어가 아니면(분해 실패) 원문 그대로', () => {
    expect(plainPairName('YL0', true)).toBe('YL0')
    expect(plainPairName('동일', false)).toBe('동일')
    expect(plainPairName(undefined, true)).toBe('')
  })
})

describe('geokgukStatusPlain — 격국 성패 생활어', () => {
  it('성격/파격/반성반파 전부 생활어 한 줄이 있다 (한/영)', async () => {
    const { geokgukStatusPlain } = await import('@/lib/calendar-engine/derivers/plainLanguage')
    for (const st of ['성격', '파격', '반성반파']) {
      expect(geokgukStatusPlain(st, 'ko')).not.toBe('')
      expect(geokgukStatusPlain(st, 'en')).not.toBe('')
    }
    // 미지의 status/미지정은 빈 문자열 — 억지 문장 금지.
    expect(geokgukStatusPlain('이상한상태', 'ko')).toBe('')
    expect(geokgukStatusPlain(undefined, 'ko')).toBe('')
  })
})

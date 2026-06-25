import { describe, it, expect } from 'vitest'
import {
  getArchetype,
  buildViralSummary,
  ARCHETYPE_BY_STEM,
  PARTNER_BY_ELEMENT,
} from '@/components/report/integrated/viral/viralArchetype'

const HANGUL = /[가-힣]/

describe('viralArchetype', () => {
  it('10간 모두 유형이 있고 ko·en 별명/한 줄이 채워져 있다', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    expect(Object.keys(ARCHETYPE_BY_STEM).sort()).toEqual(stems.sort())
    for (const a of Object.values(ARCHETYPE_BY_STEM)) {
      for (const lang of ['ko', 'en'] as const) {
        expect(a.name[lang].trim()).not.toBe('')
        expect(a.oneLiner[lang].trim()).not.toBe('')
      }
      // 영어 면엔 한글 없음
      expect(HANGUL.test(a.name.en)).toBe(false)
      expect(HANGUL.test(a.oneLiner.en)).toBe(false)
    }
  })

  it('한자/한글 일간 둘 다로 유형을 찾는다', () => {
    expect(getArchetype('庚')?.name.ko).toBe('결단의 승부사')
    expect(getArchetype('경')?.name.ko).toBe('결단의 승부사')
    expect(getArchetype('癸')?.emoji).toBe('💧')
    expect(getArchetype('XX')).toBeNull()
  })

  it('5오행 궁합이 ko·en 모두 있고 영어엔 한글이 없다', () => {
    for (const el of ['wood', 'fire', 'earth', 'metal', 'water']) {
      expect(PARTNER_BY_ELEMENT[el].ko.trim()).not.toBe('')
      expect(HANGUL.test(PARTNER_BY_ELEMENT[el].en)).toBe(false)
    }
  })

  it('buildViralSummary — 명식 1차값을 lang 해석된 요약으로 합성', () => {
    const ko = buildViralSummary({
      dayMaster: '庚',
      ascTrait: '당당하고 환하게 빛나는',
      strengths: ['의리', '결단력', '용맹', '추진력'],
      resonant: ['자아', '직업', '재물', '연애'],
      yongsinElement: 'fire',
      lang: 'ko',
    })
    expect(ko).not.toBeNull()
    expect(ko!.name).toBe('결단의 승부사')
    expect(ko!.hashtags).toEqual(['의리', '결단력', '용맹']) // 최대 3
    expect(ko!.resonant).toEqual(['자아', '직업', '재물']) // 최대 3
    expect(ko!.partner).toBe(PARTNER_BY_ELEMENT.fire.ko)
    expect(ko!.outer).toBe('당당하고 환하게 빛나는')
  })

  it('buildViralSummary — en 은 한글을 렌더하지 않는다', () => {
    const en = buildViralSummary({
      dayMaster: '癸',
      ascTrait: 'tender and protective',
      strengths: ['Insight'],
      resonant: ['Self'],
      yongsinElement: 'fire',
      lang: 'en',
    })
    expect(en).not.toBeNull()
    expect(HANGUL.test(en!.name)).toBe(false)
    expect(HANGUL.test(en!.oneLiner)).toBe(false)
    expect(HANGUL.test(en!.subtype)).toBe(false)
    expect(HANGUL.test(en!.partner ?? '')).toBe(false)
  })

  it('buildViralSummary — 강약(신강/신약/중화)으로 subtype 결이 갈린다', () => {
    const base = { dayMaster: '甲', strengths: [], resonant: [], lang: 'ko' as const }
    expect(buildViralSummary({ ...base, strength: 'strong' })!.subtype).toBe('주도형')
    expect(buildViralSummary({ ...base, strength: 'weak' })!.subtype).toBe('조율형')
    expect(buildViralSummary({ ...base, strength: null })!.subtype).toBe('균형형')
    expect(buildViralSummary({ ...base })!.subtype).toBe('균형형') // 미상 → 중화
    // oneLiner 는 유형 기본 줄 + 강약 결 한 문장으로 길어진다
    const baseLine = getArchetype('甲')!.oneLiner.ko
    const strong = buildViralSummary({ ...base, strength: 'strong' })!
    expect(strong.oneLiner).toContain(baseLine)
    expect(strong.oneLiner.length).toBeGreaterThan(baseLine.length)
  })

  it('유형 매칭이 없으면 null (카드 자동 생략)', () => {
    expect(
      buildViralSummary({ dayMaster: '??', strengths: [], resonant: [], lang: 'ko' })
    ).toBeNull()
  })
})

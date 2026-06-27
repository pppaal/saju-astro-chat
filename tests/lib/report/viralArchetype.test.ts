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
    // 데이터 실제값은 한글('신강'/'신약') — 영문만 받으면 늘 균형형으로 새던 버그 가드
    expect(buildViralSummary({ ...base, strength: '신강' })!.subtype).toBe('주도형')
    expect(buildViralSummary({ ...base, strength: '신약' })!.subtype).toBe('조율형')
    expect(buildViralSummary({ ...base })!.subtype).toBe('균형형') // 미상 → 중화
    // 십성 미지정이면 일간 archetype oneLiner 로 폴백 + 강약 결
    const baseLine = getArchetype('甲')!.oneLiner.ko
    const strong = buildViralSummary({ ...base, strength: 'strong' })!
    expect(strong.oneLiner).toContain(baseLine)
    expect(strong.oneLiner.length).toBeGreaterThan(baseLine.length)
    expect(strong.edgeLine).toBeNull() // 십성·tension 없으면 콕 집는 줄 없음
  })

  it('buildViralSummary — 지배 십성으로 헤드라인을 차트별로 합성한다', () => {
    const base = { dayMaster: '甲', strengths: [], resonant: [], lang: 'ko' as const }
    const a = buildViralSummary({ ...base, dominantSibsin: '상관', hasTension: true })!
    const b = buildViralSummary({ ...base, dominantSibsin: '정재', hasTension: true })!
    // 같은 일간(甲)인데 십성이 다르면 이름·한 줄·콕집는 줄이 모두 달라진다
    expect(a.name).not.toBe(b.name)
    expect(a.name).toContain('개척자') // 일간 역할 명사는 유지
    expect(a.name).toContain('판을 뒤집는') // 십성 수식
    expect(a.oneLiner).not.toBe(b.oneLiner)
    expect(a.edgeLine).toBeTruthy()
    expect(a.edgeLine).not.toBe(b.edgeLine)
    // tension 없으면 콕 집는 줄은 숨긴다(억지 마찰 X)
    expect(
      buildViralSummary({ ...base, dominantSibsin: '상관', hasTension: false })!.edgeLine
    ).toBeNull()
    // 알 수 없는 십성은 archetype 폴백
    expect(buildViralSummary({ ...base, dominantSibsin: 'XX', hasTension: true })!.name).toBe(
      getArchetype('甲')!.name.ko
    )
  })

  it('유형 매칭이 없으면 null (카드 자동 생략)', () => {
    expect(
      buildViralSummary({ dayMaster: '??', strengths: [], resonant: [], lang: 'ko' })
    ).toBeNull()
  })
})

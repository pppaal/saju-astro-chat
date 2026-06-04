import { describe, it, expect } from 'vitest'
import {
  elementRelation,
  signToSajuElement,
  normSajuElement,
  evalIdentity,
  evalNeeds,
  evalSocialRole,
  evalFortune,
  evalRelations,
  evalStrength,
  evalTemperament,
  evalEnergyDirection,
  evalPersona,
  dominantSajuElement,
  dominantAstroElement,
  dominantSibsinGroup,
  synthesize,
} from '@/lib/destiny-map/natalCross'

describe('natalCross — 원소 기초', () => {
  it('signToSajuElement: 4원소 → 5원소 (air≈목)', () => {
    expect(signToSajuElement('Leo')).toBe('fire')
    expect(signToSajuElement('Capricorn')).toBe('earth')
    expect(signToSajuElement('Cancer')).toBe('water')
    expect(signToSajuElement('Gemini')).toBe('wood')
  })
  it('normSajuElement: 한글·영문 정규화', () => {
    expect(normSajuElement('금')).toBe('metal')
    expect(normSajuElement('Wood')).toBe('wood')
    expect(normSajuElement('없음')).toBeUndefined()
  })
  it('elementRelation: 생극', () => {
    expect(elementRelation('fire', 'fire')).toBe('same')
    expect(elementRelation('wood', 'fire')).toBe('aGenB')
    expect(elementRelation('wood', 'earth')).toBe('aCtrlB')
    expect(elementRelation('metal', 'wood')).toBe('aCtrlB')
  })
})

describe('natalCross — 단일 포인트 교차', () => {
  it('정체성: 같은 원소 동조 / 상생 보완 / 상극 긴장', () => {
    expect(evalIdentity('화', 'Leo')?.tone).toBe('resonant')
    expect(evalIdentity('금', 'Capricorn')?.tone).toBe('complement') // 토생금
    expect(evalIdentity('목', 'Capricorn')?.tone).toBe('tension') // 목극토
    expect(evalIdentity(undefined, 'Leo')).toBeNull()
  })
  it('욕망: 달이 용신을 채움/생함/극함', () => {
    expect(evalNeeds('수', 'Cancer')?.tone).toBe('resonant')
    expect(evalNeeds('목', 'Cancer')?.tone).toBe('complement') // 수생목
    expect(evalNeeds('화', 'Cancer')?.tone).toBe('tension') // 수극화
  })
  it('사회역할: 정관격+염소 동조, +게자리 긴장', () => {
    expect(evalSocialRole('정관격', 'Capricorn')?.tone).toBe('resonant')
    expect(evalSocialRole('정관격', 'Cancer')?.tone).toBe('tension')
    expect(evalSocialRole('잡격', 'Capricorn')).toBeNull()
  })
  it('길흉: 도화 동조, 양인 긴장', () => {
    expect(evalFortune(['도화'])?.tone).toBe('resonant')
    expect(evalFortune(['양인'])?.tone).toBe('tension')
    expect(evalFortune(['천을귀인'])).toBeNull()
  })
  it('관계: 양쪽 조화/긴장/엇갈림', () => {
    expect(evalRelations(3, 0, 4, 1)?.tone).toBe('resonant')
    expect(evalRelations(0, 3, 1, 4)?.tone).toBe('tension')
    expect(evalRelations(3, 0, 1, 4)?.tone).toBe('complement')
  })
  it('강점: 강한 운성+위신 동조 / 위신만 보완', () => {
    expect(evalStrength('건록', { planet: 'Jupiter', status: 'domicile' })?.tone).toBe('resonant')
    expect(evalStrength('병', { planet: 'Venus', status: 'exaltation' })?.tone).toBe('complement')
  })
})

describe('natalCross — 분포 우세 추출', () => {
  it('dominantSajuElement', () => {
    expect(dominantSajuElement({ wood: 1, fire: 3, earth: 1 })).toBe('fire')
    expect(dominantSajuElement({ 목: 2, 화: 1 })).toBe('wood')
    expect(dominantSajuElement({})).toBeUndefined()
  })
  it('dominantAstroElement', () => {
    expect(dominantAstroElement(['Leo', 'Aries', 'Cancer'])).toBe('fire')
    expect(dominantAstroElement([])).toBeUndefined()
  })
  it('dominantSibsinGroup', () => {
    expect(dominantSibsinGroup({ 비겁: 1, 재성: 4, 관성: 1 })).toBe('재성')
    expect(dominantSibsinGroup({})).toBeUndefined()
  })
})

describe('natalCross — 분포·전체급 교차', () => {
  it('기질: 같은 우세 동조 / 상극 긴장', () => {
    expect(evalTemperament({ fire: 3 }, ['Leo', 'Aries', 'Sagittarius'])?.tone).toBe('resonant')
    expect(evalTemperament({ wood: 3 }, ['Capricorn', 'Taurus', 'Virgo'])?.tone).toBe('tension')
  })
  it('에너지: 대표 행성 강조 동조 / 없으면 보완', () => {
    expect(evalEnergyDirection({ 관성: 4 }, new Set(['Saturn']))?.tone).toBe('resonant')
    expect(evalEnergyDirection({ 관성: 4 }, new Set(['Venus']))?.tone).toBe('complement')
  })
  it('드러나는 나: 같은 원소 동조 / 상극 긴장', () => {
    expect(evalPersona('화', 'Leo')?.tone).toBe('resonant')
    expect(evalPersona('목', 'Capricorn')?.tone).toBe('tension')
  })
})

describe('natalCross — 종합', () => {
  it('동조 우세면 전체 동조 + 개수 반영', () => {
    const verdicts = [
      { tone: 'resonant' as const, reason: { ko: '', en: '' } },
      { tone: 'resonant' as const, reason: { ko: '', en: '' } },
      { tone: 'complement' as const, reason: { ko: '', en: '' } },
    ]
    const s = synthesize(verdicts, 'fire')
    expect(s?.tone).toBe('resonant')
    expect(s?.text.ko).toContain('동조 2')
  })
  it('판정 없으면 null', () => {
    expect(synthesize([])).toBeNull()
  })
})

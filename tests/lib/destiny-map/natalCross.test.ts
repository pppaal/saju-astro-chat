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
    expect(signToSajuElement('Gemini')).toBe('wood') // air 근사
  })

  it('normSajuElement: 한글·영문 모두 정규화', () => {
    expect(normSajuElement('금')).toBe('metal')
    expect(normSajuElement('metal')).toBe('metal')
    expect(normSajuElement('Wood')).toBe('wood')
    expect(normSajuElement('없음')).toBeUndefined()
  })

  it('elementRelation: 생극 판정', () => {
    expect(elementRelation('fire', 'fire')).toBe('same')
    expect(elementRelation('wood', 'fire')).toBe('aGenB') // 목생화
    expect(elementRelation('earth', 'metal')).toBe('aGenB') // 토생금
    expect(elementRelation('wood', 'earth')).toBe('aCtrlB') // 목극토
    expect(elementRelation('metal', 'wood')).toBe('aCtrlB') // 금극목
  })
})

describe('natalCross — 정체성 (일간 ↔ 태양)', () => {
  it('같은 원소 → 동조', () => {
    expect(evalIdentity('화', 'Leo')?.tone).toBe('resonant')
  })
  it('상생 → 보완', () => {
    // 일간 금(metal) ↔ 태양 흙(Capricorn=earth): 토생금
    expect(evalIdentity('금', 'Capricorn')?.tone).toBe('complement')
  })
  it('상극 → 긴장', () => {
    // 일간 목(wood) ↔ 태양 흙(Capricorn=earth): 목극토
    expect(evalIdentity('목', 'Capricorn')?.tone).toBe('tension')
  })
  it('데이터 부족 → null', () => {
    expect(evalIdentity(undefined, 'Leo')).toBeNull()
    expect(evalIdentity('화', undefined)).toBeNull()
  })
})

describe('natalCross — 필요·욕망 (용신 ↔ 달)', () => {
  it('달이 용신과 같은 원소 → 동조', () => {
    expect(evalNeeds('수', 'Cancer')?.tone).toBe('resonant') // water == water
  })
  it('달이 용신을 생함 → 보완', () => {
    expect(evalNeeds('목', 'Cancer')?.tone).toBe('complement') // 수생목
  })
  it('달이 용신을 극함 → 긴장', () => {
    expect(evalNeeds('화', 'Cancer')?.tone).toBe('tension') // 수극화
  })
})

describe('natalCross — 사회 역할 (격국 ↔ MC)', () => {
  it('정관격 + MC 염소자리(토성 입궁) → 동조', () => {
    expect(evalSocialRole('정관격', 'Capricorn')?.tone).toBe('resonant')
  })
  it('정관격 + MC 게자리(토성 손상) → 긴장', () => {
    expect(evalSocialRole('정관격', 'Cancer')?.tone).toBe('tension')
  })
  it('매핑 없는 격국 → null (폴백은 호출부에서)', () => {
    expect(evalSocialRole('잡격', 'Capricorn')).toBeNull()
  })
})

describe('natalCross — 길흉 (신살 ↔ 행성)', () => {
  it('도화 (금성 +) → 동조', () => {
    expect(evalFortune(['도화'])?.tone).toBe('resonant')
  })
  it('양인 (화성 −) → 긴장', () => {
    expect(evalFortune(['양인'])?.tone).toBe('tension')
  })
  it('매핑 없는 신살만 있으면 → null', () => {
    expect(evalFortune(['천을귀인'])).toBeNull()
  })
})

describe('natalCross — 관계 (합충 ↔ aspect)', () => {
  it('양쪽 조화 우세 → 동조', () => {
    expect(evalRelations(3, 0, 4, 1)?.tone).toBe('resonant')
  })
  it('양쪽 긴장 우세 → 긴장', () => {
    expect(evalRelations(0, 3, 1, 4)?.tone).toBe('tension')
  })
  it('엇갈림 → 보완', () => {
    expect(evalRelations(3, 0, 1, 4)?.tone).toBe('complement')
  })
})

describe('natalCross — 강점 (12운성 ↔ dignity)', () => {
  it('강한 운성 + 위신 행성 → 동조', () => {
    expect(evalStrength('건록', { planet: 'Jupiter', status: 'domicile' })?.tone).toBe('resonant')
  })
  it('위신 행성만 → 보완', () => {
    expect(evalStrength('병', { planet: 'Venus', status: 'exaltation' })?.tone).toBe('complement')
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
    expect(s?.text.ko).toContain('화 기운')
  })
  it('판정 없으면 null', () => {
    expect(synthesize([])).toBeNull()
  })
})

describe('natalCross — 분포 우세 추출', () => {
  it('dominantSajuElement: 한/영 키 혼용 집계', () => {
    expect(dominantSajuElement({ wood: 1, fire: 3, earth: 1, metal: 0, water: 1 })).toBe('fire')
    expect(dominantSajuElement({ 목: 2, 화: 1 })).toBe('wood')
    expect(dominantSajuElement({})).toBeUndefined()
  })
  it('dominantAstroElement: sign 배열에서 최다 원소', () => {
    expect(dominantAstroElement(['Leo', 'Aries', 'Cancer'])).toBe('fire')
    expect(dominantAstroElement([])).toBeUndefined()
  })
  it('dominantSibsinGroup: 그룹 최댓값', () => {
    expect(dominantSibsinGroup({ 비겁: 1, 식상: 0, 재성: 4, 관성: 1, 인성: 0 })).toBe('재성')
    expect(dominantSibsinGroup({})).toBeUndefined()
  })
})

describe('natalCross — 기질 (오행 분포 ↔ 원소 분포)', () => {
  it('양쪽 우세가 같은 원소 → 동조', () => {
    // 사주 화 우세 ↔ 점성 불(Leo/Aries) 우세
    const v = evalTemperament({ fire: 3, wood: 1 }, ['Leo', 'Aries', 'Sagittarius'])
    expect(v?.tone).toBe('resonant')
  })
  it('상극 우세 → 긴장', () => {
    // 사주 목 우세 ↔ 점성 흙(Capricorn 등) 우세: 목극토
    const v = evalTemperament({ wood: 3 }, ['Capricorn', 'Taurus', 'Virgo'])
    expect(v?.tone).toBe('tension')
  })
})

describe('natalCross — 에너지 방향 (십신 그룹 ↔ 강조 행성)', () => {
  it('우세 그룹의 대표 행성이 강조됨 → 동조', () => {
    // 관성 우세 → Saturn/Mars, Saturn 강조됨
    const v = evalEnergyDirection({ 관성: 4, 비겁: 1 }, new Set(['Saturn']))
    expect(v?.tone).toBe('resonant')
  })
  it('대표 행성 강조 없음 → 보완', () => {
    const v = evalEnergyDirection({ 관성: 4 }, new Set(['Venus']))
    expect(v?.tone).toBe('complement')
  })
})

describe('natalCross — 드러나는 나 (일간 ↔ ASC)', () => {
  it('일간과 ASC 같은 원소 → 동조', () => {
    expect(evalPersona('화', 'Leo')?.tone).toBe('resonant')
  })
  it('상극 → 긴장', () => {
    expect(evalPersona('목', 'Capricorn')?.tone).toBe('tension')
  })
})

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
  evalDrive,
  evalKeyAspect,
  dominantSajuElement,
  dominantAstroElement,
  dominantSibsinGroup,
  synthesize,
  sajuKeyMapping,
  evalYinYang,
} from '@/lib/report/natalCross'

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
  it('길흉: 신살 대응 행성이 차트에서 강조됐을 때만 진짜 교차(길→동조, 흉→긴장)', () => {
    // 진짜 교차: 신살의 대응 행성이 *실제 차트에서 강조*돼야 강한 톤.
    const dohwaPlanet = sajuKeyMapping('도화')!.astro
    const yanginPlanet = sajuKeyMapping('양인')!.astro
    // 길신(도화) + 행성 강조 → 동조 / 강조 없으면 보완으로 약화
    expect(evalFortune(['도화'], new Set([dohwaPlanet]))?.tone).toBe('resonant')
    expect(evalFortune(['도화'], new Set())?.tone).toBe('complement')
    // 흉신(양인) + 행성 강조 → 긴장 / 강조 없으면 보완
    expect(evalFortune(['양인'], new Set([yanginPlanet]))?.tone).toBe('tension')
    expect(evalFortune(['양인'], new Set())?.tone).toBe('complement')
    // 매핑 없는 신살은 null
    expect(evalFortune(['천을귀인'], new Set())).toBeNull()
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

describe('natalCross — 추진력 (신강약 ↔ 자기주장 행성)', () => {
  it('신강 + 태양/화성 강조 → 동조', () => {
    expect(evalDrive('강', true)?.tone).toBe('resonant')
    expect(evalDrive('strong', true)?.tone).toBe('resonant')
  })
  it('신강 + 강조 없음 → 보완', () => {
    expect(evalDrive('신강', false)?.tone).toBe('complement')
  })
  it('신약 + 강조 없음 → 동조 / 신약 + 강조 → 긴장', () => {
    expect(evalDrive('약', false)?.tone).toBe('resonant')
    expect(evalDrive('weak', true)?.tone).toBe('tension')
  })
  it('중화 → 중립, 없음 → null', () => {
    expect(evalDrive('중', false)?.tone).toBe('neutral')
    expect(evalDrive(undefined, true)).toBeNull()
  })
})

describe('natalCross — 핵심 각 (가장 센 행성 각)', () => {
  const aspects = [
    { from: { name: 'Sun' }, to: { name: 'Saturn' }, type: 'square', orb: 1.2 },
    { from: { name: 'Moon' }, to: { name: 'Venus' }, type: 'trine', orb: 4.5 },
  ]
  it('하드각(스퀘어)은 사주 그룹이 일치해도 강점 단정 대신 긴장(단련)', () => {
    // 태양·토성(관성) square 가 orb 1.2 로 최강. 하드각이라 일치해도 resonant 가
    // 아니라 tension(마찰을 통해 단련) — C8a: 각 성질을 톤에 반영.
    const v = evalKeyAspect(aspects, '관성')!
    expect(v.tone).toBe('tension')
    expect(v.reason.ko).toContain('마찰을 통해 단련')
    expect(v.reason.en).toContain('forged through friction')
  })
  it('하드각(스퀘어)은 그룹 불일치여도 긴장', () => {
    expect(evalKeyAspect(aspects, '재성')?.tone).toBe('tension')
  })
  it('소프트각(트라인)은 그룹 일치 시 동조(자연스러운 흐름)', () => {
    const soft = [{ from: { name: 'Venus' }, to: { name: 'Mars' }, type: 'trine', orb: 1 }]
    const v = evalKeyAspect(soft, '재성')! // Mars|Venus 그룹=재성 → 일치
    expect(v.tone).toBe('resonant')
    expect(v.reason.ko).toContain('자연스럽게 흐르는')
    expect(v.reason.en).toContain('flows naturally')
  })
  it('소프트각(트라인) 그룹 불일치 → 보완', () => {
    const soft = [{ from: { name: 'Venus' }, to: { name: 'Mars' }, type: 'trine', orb: 1 }]
    expect(evalKeyAspect(soft, '관성')?.tone).toBe('complement')
  })
  it('매핑된 각 없으면 null', () => {
    expect(
      evalKeyAspect(
        [{ from: { name: 'Pluto' }, to: { name: 'Neptune' }, type: 'trine', orb: 1 }],
        '관성'
      )
    ).toBeNull()
    expect(evalKeyAspect([], '관성')).toBeNull()
  })
})

describe('natalCross — 음양 리듬 (sect ↔ 일간 음양)', () => {
  it('일치(양+주 / 음+야) → 동조', () => {
    expect(evalYinYang('陽', 'day')?.tone).toBe('resonant')
    expect(evalYinYang('陰', 'night')?.tone).toBe('resonant')
  })
  it('불일치(양+야 / 음+주) → 보완', () => {
    expect(evalYinYang('陽', 'night')?.tone).toBe('complement')
    expect(evalYinYang('陰', 'day')?.tone).toBe('complement')
  })
  it('데이터 없으면 null', () => {
    expect(evalYinYang(undefined, 'day')).toBeNull()
    expect(evalYinYang('陽', undefined)).toBeNull()
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
    // "결론 먼저" 재작성: 유형(verdict)이 맨 앞, 개수는 스캔형 라벨로 뒤에.
    expect(s?.text.ko.startsWith('사주와 별자리가')).toBe(true)
    expect(s?.text.ko).toContain('잘 맞는 2곳')
    expect(s?.text.ko).toContain('서로 돕는 1곳')
  })
  it('판정 없으면 null', () => {
    expect(synthesize([])).toBeNull()
  })
})

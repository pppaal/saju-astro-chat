// Bridge between Saju 오행 and Astrology 4-element vocabularies.
// Pure data, no logic. Logic lives in normalizer/rule predicates.

export type SajuElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
export type AstroElement = 'fire' | 'earth' | 'air' | 'water'

// 오행(한글) ↔ saju element key
export const KO_TO_SAJU_ELEMENT: Record<string, SajuElement> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}

// 5행 ↔ 4원소 후보 매핑.
//
// fire/earth/water는 양 시스템에 동치 개념이 있어 정확 매핑.
// wood, metal은 4원소에 1:1 대응이 없어 의미가 가장 가까운 air에만 약하게 연결한다.
// (wood = 확장·성장 = air의 movement; metal = 분별·수렴 = air의 analytic)
// 룰 predicate는 이 fallback에 대해 strength penalty(보통 ×0.7)를 적용한다.
//
// 이전에 있던 wood ↔ earth 매핑은 목극토(상극) 관계라 동치로 보기 어렵고
// "사주 목 강 + 점성 earth 강 → 같은 본성"식의 거짓 발화를 만들어 제거.
const ASTRO_TO_SAJU: Record<AstroElement, SajuElement[]> = {
  fire: ['fire'],
  earth: ['earth'],
  air: ['wood', 'metal'],
  water: ['water'],
}

const SAJU_TO_ASTRO: Record<SajuElement, AstroElement[]> = {
  wood: ['air'],
  fire: ['fire'],
  earth: ['earth'],
  metal: ['air'],
  water: ['water'],
}

// 오행 상생: A → B (A가 B를 생함)
export const GENERATES: Record<SajuElement, SajuElement> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}

// 오행 상극: A → B (A가 B를 극함)
export const CONTROLS: Record<SajuElement, SajuElement> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
}

// 점성 사인 → 4원소
export const SIGN_TO_ASTRO_ELEMENT: Record<string, AstroElement> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
  // Korean variants used in the codebase
  양자리: 'fire',
  사자자리: 'fire',
  사수자리: 'fire',
  황소자리: 'earth',
  처녀자리: 'earth',
  염소자리: 'earth',
  쌍둥이자리: 'air',
  천칭자리: 'air',
  물병자리: 'air',
  게자리: 'water',
  전갈자리: 'water',
  물고기자리: 'water',
}

// Bridge: 사주 십성/육친 ↔ 점성 하우스 ↔ 운세 도메인.
// Pure tables. The rule predicates use these to tag signals with a domain.

import type { Domain } from '../types'

// 사주 십성 → 도메인 (가장 강한 연결만)
export const SIBSIN_TO_DOMAIN: Record<string, Domain> = {
  비견: 'self',
  겁재: 'self',
  식신: 'career',
  상관: 'career',
  편재: 'money',
  정재: 'money',
  편관: 'career',
  정관: 'career',
  편인: 'family',
  정인: 'family',
}

// 사주 육친(배우자/자녀 등) 단어 → 도메인
export const YUKCHIN_TO_DOMAIN: Record<string, Domain> = {
  배우자: 'love',
  남편: 'love',
  아내: 'love',
  부친: 'family',
  모친: 'family',
  자녀: 'family',
  형제: 'family',
}

// 점성 하우스 → 도메인 (대표 의미만)
export const HOUSE_TO_DOMAIN: Record<number, Domain> = {
  1: 'self',
  2: 'money',
  3: 'self', // communication, siblings — collapse to self
  4: 'family',
  5: 'love', // romance, creativity
  6: 'health',
  7: 'love', // partnership
  8: 'money', // shared resources
  9: 'career', // higher learning, vocation
  10: 'career',
  11: 'career', // groups, goals
  12: 'health', // hidden, retreat
}

// 점성 행성 → 강한 도메인 연결 (보조 태깅용, 단정적 X)
export const PLANET_TO_DOMAIN: Record<string, Domain> = {
  Sun: 'self',
  Moon: 'family',
  Mercury: 'career',
  Venus: 'love',
  Mars: 'career',
  Jupiter: 'money',
  Saturn: 'career',
}

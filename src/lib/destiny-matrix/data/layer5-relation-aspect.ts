// src/lib/destiny-matrix/data/layer5-relation-aspect.ts
// Layer 5: Relations-Aspects Matrix (형충회합-애스펙트 교차)

import type { RelationAspectMatrix, InteractionCode, BranchRelation } from '../types';
import type { AspectType } from '../../astrology/foundation/types';

const c = (
  level: InteractionCode['level'],
  score: number,
  icon: string,
  colorCode: InteractionCode['colorCode'],
  keyword: string,
  keywordEn: string
): InteractionCode => ({
  level,
  score,
  icon,
  colorCode,
  keyword,
  keywordEn,
});

// 지지 관계-애스펙트 교차 매트릭스
// 행: 삼합/육합/방합/충/형/파/해/원진
// 열: Conjunction/Sextile/Square/Trine/Opposition/Quincunx

export const RELATION_ASPECT_MATRIX: RelationAspectMatrix = {
  samhap: { // 삼합 (三合) - 가장 조화로운 결합
    conjunction: c('extreme', 10, '💥', 'purple', '극강시너지', 'Extreme synergy'),
    sextile: c('extreme', 9, '🚀', 'purple', '배가효과', 'Doubled effect'),
    square: c('clash', 5, '⚡', 'yellow', '긴장강화', 'Tension strengthen'),
    trine: c('extreme', 10, '🌟', 'purple', '최상조화', 'Best harmony'),
    opposition: c('amplify', 7, '💪', 'green', '균형강화', 'Balance strengthen'),
    semisextile: c('balance', 6, '⚖️', 'blue', '미세조정', 'Fine tune'),
    quincunx: c('balance', 5, '⚖️', 'blue', '적응필요', 'Adaptation need'),
    quintile: c('amplify', 8, '✨', 'green', '창조강화', 'Creation strengthen'),
    biquintile: c('amplify', 7, '💫', 'green', '재능발현', 'Talent manifest'),
  },
  yukhap: { // 육합 (六合) - 부드러운 결합
    conjunction: c('amplify', 8, '🤝', 'green', '조화결합', 'Harmony combine'),
    sextile: c('amplify', 8, '💕', 'green', '시너지효과', 'Synergy effect'),
    square: c('balance', 6, '⚖️', 'blue', '보완긴장', 'Complement tension'),
    trine: c('amplify', 8, '💎', 'green', '안정조화', 'Stable harmony'),
    opposition: c('balance', 6, '⚖️', 'blue', '균형유지', 'Balance maintain'),
    semisextile: c('amplify', 7, '🌱', 'green', '성장지원', 'Growth support'),
    quincunx: c('balance', 5, '🔄', 'blue', '적응조절', 'Adapt adjust'),
    quintile: c('amplify', 7, '🎨', 'green', '창조조화', 'Creative harmony'),
    biquintile: c('amplify', 7, '✨', 'green', '재능조화', 'Talent harmony'),
  },
  banghap: { // 방합 (方合) - 같은 방향의 결합
    conjunction: c('amplify', 8, '🏔️', 'green', '강화집중', 'Strengthen focus'),
    sextile: c('amplify', 8, '📈', 'green', '성장확대', 'Growth expand'),
    square: c('amplify', 7, '💪', 'green', '도전성장', 'Challenge growth'),
    trine: c('extreme', 9, '🚀', 'purple', '확장조화', 'Expansion harmony'),
    opposition: c('clash', 5, '💥', 'yellow', '대립긴장', 'Opposition tension'),
    semisextile: c('balance', 6, '⚖️', 'blue', '방향미세', 'Direction fine'),
    quincunx: c('balance', 5, '🌀', 'blue', '전환필요', 'Transition need'),
    quintile: c('amplify', 7, '🎯', 'green', '목표창조', 'Goal creation'),
    biquintile: c('amplify', 7, '💡', 'green', '방향창조', 'Direction create'),
  },
  chung: { // 충 (沖) - 대립/충돌
    conjunction: c('extreme', 8, '💥', 'purple', '폭발적에너지', 'Explosive energy'),
    sextile: c('clash', 5, '⚡', 'yellow', '자극활성', 'Stimulate activate'),
    square: c('conflict', 2, '☠️', 'red', '파괴위험', 'Destruction risk'),
    trine: c('clash', 5, '⚔️', 'yellow', '갈등완화', 'Conflict ease'),
    opposition: c('extreme', 9, '💥', 'purple', '극심충돌', 'Extreme clash'),
    semisextile: c('clash', 4, '⚡', 'yellow', '미세충돌', 'Minor clash'),
    quincunx: c('clash', 4, '😵', 'yellow', '혼란가중', 'Confusion add'),
    quintile: c('balance', 5, '🔄', 'blue', '창조적긴장', 'Creative tension'),
    biquintile: c('balance', 5, '💫', 'blue', '변환가능', 'Transform possible'),
  },
  hyeong: { // 형 (刑) - 형벌/시련
    conjunction: c('clash', 5, '😰', 'yellow', '압박집중', 'Pressure focus'),
    sextile: c('clash', 4, '⚠️', 'yellow', '주의필요', 'Caution need'),
    square: c('conflict', 3, '💥', 'red', '시련가중', 'Trial intensify'),
    trine: c('balance', 5, '⚖️', 'blue', '성장통완화', 'Growing pain ease'),
    opposition: c('clash', 4, '😓', 'yellow', '고통지속', 'Pain persist'),
    semisextile: c('clash', 4, '⚠️', 'yellow', '미세압박', 'Minor pressure'),
    quincunx: c('clash', 4, '🌀', 'yellow', '꼬임복잡', 'Tangle complex'),
    quintile: c('balance', 5, '🔄', 'blue', '시련극복', 'Trial overcome'),
    biquintile: c('balance', 5, '💪', 'blue', '성장전환', 'Growth transform'),
  },
  pa: { // 파 (破) - 파괴/손상
    conjunction: c('clash', 4, '💔', 'yellow', '손상집중', 'Damage focus'),
    sextile: c('balance', 5, '⚖️', 'blue', '약화완화', 'Weaken ease'),
    square: c('conflict', 3, '❌', 'red', '파손가중', 'Break intensify'),
    trine: c('clash', 4, '😢', 'yellow', '실망완화', 'Disappointment ease'),
    opposition: c('clash', 5, '💥', 'yellow', '파열긴장', 'Rupture tension'),
    semisextile: c('clash', 4, '⚠️', 'yellow', '미세손상', 'Minor damage'),
    quincunx: c('balance', 5, '🔄', 'blue', '해체조정', 'Dismantle adjust'),
    quintile: c('balance', 5, '🔄', 'blue', '재구성', 'Reconstruct'),
    biquintile: c('balance', 5, '💡', 'blue', '새로운형태', 'New form'),
  },
  hae: { // 해 (害) - 해침/방해
    conjunction: c('clash', 4, '😰', 'yellow', '은밀방해', 'Hidden obstruct'),
    sextile: c('clash', 4, '⚠️', 'yellow', '경계필요', 'Caution need'),
    square: c('clash', 4, '😢', 'yellow', '상처위험', 'Wound risk'),
    trine: c('balance', 5, '⚖️', 'blue', '마찰완화', 'Friction ease'),
    opposition: c('clash', 5, '😵', 'yellow', '배신위험', 'Betrayal risk'),
    semisextile: c('clash', 4, '⚠️', 'yellow', '미세방해', 'Minor obstruct'),
    quincunx: c('clash', 4, '🌀', 'yellow', '음해가능', 'Scheme possible'),
    quintile: c('balance', 5, '🛡️', 'blue', '방어창조', 'Defense create'),
    biquintile: c('balance', 5, '💡', 'blue', '회피방법', 'Avoid method'),
  },
  wonjin: { // 원진 (怨嗔) - 원한/불화
    conjunction: c('clash', 5, '😤', 'yellow', '불화집중', 'Discord focus'),
    sextile: c('clash', 4, '😒', 'yellow', '거부감', 'Rejection'),
    square: c('clash', 5, '😡', 'yellow', '충돌격화', 'Clash escalate'),
    trine: c('clash', 4, '😤', 'yellow', '긴장지속', 'Tension persist'),
    opposition: c('clash', 5, '😵', 'yellow', '원한깊음', 'Resentment deep'),
    semisextile: c('clash', 4, '😒', 'yellow', '미세불화', 'Minor discord'),
    quincunx: c('clash', 4, '🌀', 'yellow', '악연가능', 'Bad fate possible'),
    quintile: c('balance', 5, '🔄', 'blue', '화해창조', 'Reconcile create'),
    biquintile: c('balance', 5, '💡', 'blue', '해소방법', 'Resolve method'),
  },
};

// 지지 관계 설명
export const BRANCH_RELATION_INFO = {
  samhap: {
    ko: '삼합 (三合) - 세 지지가 만나 오행의 기운을 완성하는 가장 강력한 결합',
    en: 'Triple Combination - Three branches combine to complete an element, strongest bond',
    combinations: ['申子辰 (수)', '寅午戌 (화)', '巳酉丑 (금)', '亥卯未 (목)'],
  },
  yukhap: {
    ko: '육합 (六合) - 두 지지가 만나 조화롭게 결합하는 관계',
    en: 'Six Harmony - Two branches combine harmoniously',
    combinations: ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'],
  },
  banghap: {
    ko: '방합 (方合) - 같은 방향(계절)의 세 지지가 모여 힘을 합치는 관계',
    en: 'Directional Combination - Three branches of same direction/season combine',
    combinations: ['寅卯辰 (동/봄)', '巳午未 (남/여름)', '申酉戌 (서/가을)', '亥子丑 (북/겨울)'],
  },
  chung: {
    ko: '충 (沖) - 서로 반대 방향의 지지가 부딪히는 대립 관계',
    en: 'Clash - Opposing branches collide',
    combinations: ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'],
  },
  hyeong: {
    ko: '형 (刑) - 서로 해치거나 벌을 주는 시련의 관계',
    en: 'Punishment - Branches that harm or penalize each other',
    combinations: ['子卯 (무례형)', '寅巳申 (무은형)', '丑戌未 (무세형)', '辰辰/午午/酉酉/亥亥 (자형)'],
  },
  pa: {
    ko: '파 (破) - 서로 깨뜨리거나 손상시키는 관계',
    en: 'Break - Branches that break or damage each other',
    combinations: ['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌'],
  },
  hae: {
    ko: '해 (害) - 서로 해치거나 방해하는 관계',
    en: 'Harm - Branches that harm or obstruct each other',
    combinations: ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'],
  },
  wonjin: {
    ko: '원진 (怨嗔) - 서로 원망하고 미워하는 불화의 관계',
    en: 'Resentment - Branches that resent and dislike each other',
    combinations: ['子未', '丑午', '寅酉', '卯申', '辰亥', '巳戌'],
  },
} as const;

// 애스펙트 설명
export const ASPECT_INFO = {
  conjunction: {
    angle: 0,
    orb: 8,
    ko: '합 (0°) - 에너지가 합쳐져 강화되는 관계',
    en: 'Conjunction (0°) - Energies merge and intensify',
    nature: 'major',
  },
  sextile: {
    angle: 60,
    orb: 4,
    ko: '육분 (60°) - 조화롭게 협력하는 기회의 관계',
    en: 'Sextile (60°) - Harmonious cooperation, opportunities',
    nature: 'major',
  },
  square: {
    angle: 90,
    orb: 6,
    ko: '사각 (90°) - 긴장과 도전을 통한 성장의 관계',
    en: 'Square (90°) - Tension and challenges for growth',
    nature: 'major',
  },
  trine: {
    angle: 120,
    orb: 6,
    ko: '삼각 (120°) - 자연스럽게 흐르는 조화의 관계',
    en: 'Trine (120°) - Natural flow and harmony',
    nature: 'major',
  },
  opposition: {
    angle: 180,
    orb: 8,
    ko: '충 (180°) - 균형을 찾아야 하는 대립의 관계',
    en: 'Opposition (180°) - Polarity requiring balance',
    nature: 'major',
  },
  semisextile: {
    angle: 30,
    orb: 2,
    ko: '반육분 (30°) - 미세한 조정이 필요한 관계',
    en: 'Semisextile (30°) - Minor adjustment needed',
    nature: 'minor',
  },
  quincunx: {
    angle: 150,
    orb: 3,
    ko: '인컨정트 (150°) - 적응과 조절이 필요한 불편한 관계',
    en: 'Quincunx (150°) - Uncomfortable, requires adaptation',
    nature: 'minor',
  },
  quintile: {
    angle: 72,
    orb: 2,
    ko: '퀸타일 (72°) - 창조적 재능의 관계',
    en: 'Quintile (72°) - Creative talent connection',
    nature: 'minor',
  },
  biquintile: {
    angle: 144,
    orb: 2,
    ko: '바이퀸타일 (144°) - 숙련된 재능의 관계',
    en: 'Biquintile (144°) - Skilled talent connection',
    nature: 'minor',
  },
} as const;

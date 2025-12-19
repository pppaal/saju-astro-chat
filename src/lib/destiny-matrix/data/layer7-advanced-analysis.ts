// src/lib/destiny-matrix/data/layer7-advanced-analysis.ts
/**
 * ============================================================================
 * Destiny Fusion Matrix™ - Layer 7: Advanced Analysis Matrix (고급분석 매트릭스)
 * ============================================================================
 * © 2024 All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, distribution, or reverse engineering is prohibited.
 * ============================================================================
 */

import type { AdvancedAnalysisMatrix, InteractionCode, AdvancedAnalysisRow, ProgressionType } from '../types';

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

// 고급분석 매트릭스
// 행: 19개 격국 + 용신별(목/화/토/금/수)
// 열: Secondary/SolarArc/SolarReturn/LunarReturn/Draconic/Harmonics

export const ADVANCED_ANALYSIS_MATRIX: AdvancedAnalysisMatrix = {
  // ===== 정격 (Regular Patterns) - 8종 =====
  jeonggwan: { // 정관격 - 정당한 권위와 명예
    secondary: c('amplify', 8, '🎖️', 'green', '명예발전', 'Honor development'),
    solarArc: c('extreme', 9, '🏛️', 'purple', '사회적상승', 'Social rise'),
    solarReturn: c('amplify', 8, '👔', 'green', '직장연간', 'Career year'),
    lunarReturn: c('amplify', 7, '📋', 'green', '책임월간', 'Duty month'),
    draconic: c('extreme', 9, '⚖️', 'purple', '정의영혼', 'Justice soul'),
    harmonics: c('amplify', 8, '🏆', 'green', 'H10명예', 'H10 Honor'),
  },
  pyeongwan: { // 편관격 (칠살격) - 권력과 도전
    secondary: c('amplify', 8, '⚔️', 'green', '권력추구', 'Power pursuit'),
    solarArc: c('extreme', 9, '🔱', 'purple', '돌파방향', 'Breakthrough direction'),
    solarReturn: c('extreme', 9, '⚡', 'purple', '도전연간', 'Challenge year'),
    lunarReturn: c('clash', 5, '😤', 'yellow', '압박월간', 'Pressure month'),
    draconic: c('extreme', 9, '🗡️', 'purple', '전사영혼', 'Warrior soul'),
    harmonics: c('extreme', 9, '⚔️', 'purple', 'H8변혁', 'H8 Transform'),
  },
  jeongin: { // 정인격 - 학문과 지혜
    secondary: c('amplify', 8, '📚', 'green', '학문발전', 'Academic development'),
    solarArc: c('amplify', 7, '🎓', 'green', '지식방향', 'Knowledge direction'),
    solarReturn: c('amplify', 8, '📖', 'green', '학습연간', 'Learning year'),
    lunarReturn: c('amplify', 8, '🤱', 'green', '보살핌월', 'Nurturing month'),
    draconic: c('extreme', 9, '🧠', 'purple', '지혜영혼', 'Wisdom soul'),
    harmonics: c('amplify', 8, '📚', 'green', 'H9지혜', 'H9 Wisdom'),
  },
  pyeongin: { // 편인격 - 특수재능과 영성
    secondary: c('amplify', 7, '🔮', 'green', '영적발전', 'Spiritual development'),
    solarArc: c('amplify', 8, '🎭', 'green', '특수방향', 'Special direction'),
    solarReturn: c('amplify', 7, '🌀', 'green', '변화연간', 'Change year'),
    lunarReturn: c('clash', 5, '😶', 'yellow', '고립월간', 'Isolation month'),
    draconic: c('extreme', 9, '🔮', 'purple', '신비영혼', 'Mystic soul'),
    harmonics: c('extreme', 9, '🔮', 'purple', 'H12초월', 'H12 Transcend'),
  },
  siksin: { // 식신격 - 표현과 복록
    secondary: c('amplify', 8, '🍀', 'green', '복록발전', 'Fortune development'),
    solarArc: c('amplify', 8, '🎨', 'green', '표현방향', 'Expression direction'),
    solarReturn: c('extreme', 9, '🌟', 'purple', '풍요연간', 'Abundance year'),
    lunarReturn: c('amplify', 8, '😊', 'green', '안락월간', 'Comfort month'),
    draconic: c('extreme', 9, '🎨', 'purple', '창조영혼', 'Creative soul'),
    harmonics: c('amplify', 8, '🎭', 'green', 'H5창조', 'H5 Create'),
  },
  sanggwan: { // 상관격 - 재능과 반항
    secondary: c('amplify', 7, '💡', 'green', '재능발현', 'Talent manifest'),
    solarArc: c('extreme', 9, '🚀', 'purple', '돌출방향', 'Standout direction'),
    solarReturn: c('amplify', 8, '🎤', 'green', '표현연간', 'Expression year'),
    lunarReturn: c('clash', 5, '😤', 'yellow', '반항월간', 'Rebel month'),
    draconic: c('extreme', 9, '💫', 'purple', '천재영혼', 'Genius soul'),
    harmonics: c('extreme', 9, '🎨', 'purple', 'H5표현', 'H5 Express'),
  },
  jeongjae: { // 정재격 - 안정적 재물
    secondary: c('amplify', 8, '💰', 'green', '재물축적', 'Wealth accumulate'),
    solarArc: c('amplify', 7, '🏦', 'green', '안정방향', 'Stability direction'),
    solarReturn: c('amplify', 8, '💵', 'green', '수입연간', 'Income year'),
    lunarReturn: c('amplify', 8, '🏠', 'green', '가정월간', 'Family month'),
    draconic: c('extreme', 9, '💎', 'purple', '풍요영혼', 'Abundance soul'),
    harmonics: c('amplify', 8, '💰', 'green', 'H2가치', 'H2 Value'),
  },
  pyeonjae: { // 편재격 - 유동적 재물과 사업
    secondary: c('amplify', 8, '📈', 'green', '사업발전', 'Business development'),
    solarArc: c('extreme', 9, '🚀', 'purple', '확장방향', 'Expansion direction'),
    solarReturn: c('extreme', 9, '💸', 'purple', '투자연간', 'Investment year'),
    lunarReturn: c('clash', 5, '🎲', 'yellow', '변동월간', 'Fluctuation month'),
    draconic: c('extreme', 9, '🌍', 'purple', '무역영혼', 'Trade soul'),
    harmonics: c('amplify', 8, '📊', 'green', 'H8변혁', 'H8 Transform'),
  },

  // ===== 특수격 (Special Patterns) - 2종 =====
  geonrok: { // 건록격 - 자수성가
    secondary: c('extreme', 9, '💪', 'purple', '자립발전', 'Self-reliant development'),
    solarArc: c('extreme', 9, '🏃', 'purple', '독립방향', 'Independence direction'),
    solarReturn: c('extreme', 9, '🏆', 'purple', '성취연간', 'Achievement year'),
    lunarReturn: c('amplify', 8, '💪', 'green', '활력월간', 'Vitality month'),
    draconic: c('extreme', 10, '👑', 'purple', '왕자영혼', 'Prince soul'),
    harmonics: c('extreme', 9, '🔥', 'purple', 'H1자아', 'H1 Self'),
  },
  yangin: { // 양인격 - 강렬한 결단력
    secondary: c('amplify', 7, '⚔️', 'green', '결단발전', 'Decisive development'),
    solarArc: c('extreme', 9, '⚡', 'purple', '급진방향', 'Radical direction'),
    solarReturn: c('clash', 5, '🔪', 'yellow', '위험연간', 'Risk year'),
    lunarReturn: c('clash', 4, '😤', 'yellow', '충동월간', 'Impulse month'),
    draconic: c('extreme', 9, '🗡️', 'purple', '전사영혼', 'Warrior soul'),
    harmonics: c('extreme', 9, '⚔️', 'purple', 'H1+H8', 'H1+H8'),
  },

  // ===== 종격 (Following Patterns) - 4종 =====
  jonga: { // 종아격 - 식상(자녀운) 따름
    secondary: c('amplify', 8, '🎨', 'green', '창작발전', 'Creative development'),
    solarArc: c('amplify', 8, '🌟', 'green', '표현방향', 'Expression direction'),
    solarReturn: c('extreme', 9, '👶', 'purple', '자녀연간', 'Children year'),
    lunarReturn: c('amplify', 8, '😊', 'green', '즐거움월', 'Joy month'),
    draconic: c('extreme', 9, '🎭', 'purple', '예술영혼', 'Artist soul'),
    harmonics: c('extreme', 9, '🎨', 'purple', 'H5창조', 'H5 Create'),
  },
  jongjae: { // 종재격 - 재성(재물운) 따름
    secondary: c('amplify', 8, '💰', 'green', '재물발전', 'Wealth development'),
    solarArc: c('extreme', 9, '📈', 'purple', '부방향', 'Wealth direction'),
    solarReturn: c('extreme', 9, '💎', 'purple', '횡재연간', 'Windfall year'),
    lunarReturn: c('amplify', 8, '💵', 'green', '수입월간', 'Income month'),
    draconic: c('extreme', 10, '💰', 'purple', '부자영혼', 'Rich soul'),
    harmonics: c('extreme', 9, '💎', 'purple', 'H2+H8', 'H2+H8'),
  },
  jongsal: { // 종살격 - 관성(권위) 따름
    secondary: c('amplify', 7, '🎖️', 'green', '권위발전', 'Authority development'),
    solarArc: c('extreme', 9, '🏛️', 'purple', '권력방향', 'Power direction'),
    solarReturn: c('extreme', 9, '👔', 'purple', '승진연간', 'Promotion year'),
    lunarReturn: c('clash', 5, '😰', 'yellow', '압박월간', 'Pressure month'),
    draconic: c('extreme', 9, '⚖️', 'purple', '통치영혼', 'Ruler soul'),
    harmonics: c('extreme', 9, '🏛️', 'purple', 'H10권력', 'H10 Power'),
  },
  jonggang: { // 종강격 - 비겁(형제운) 따름
    secondary: c('amplify', 8, '🤝', 'green', '협력발전', 'Cooperation development'),
    solarArc: c('amplify', 8, '👥', 'green', '동료방향', 'Peer direction'),
    solarReturn: c('amplify', 8, '🤝', 'green', '파트너연간', 'Partner year'),
    lunarReturn: c('amplify', 8, '💪', 'green', '경쟁월간', 'Competition month'),
    draconic: c('extreme', 9, '👑', 'purple', '리더영혼', 'Leader soul'),
    harmonics: c('amplify', 8, '👥', 'green', 'H11동료', 'H11 Peer'),
  },

  // ===== 외격 (External Patterns) - 5종 =====
  gokjik: { // 곡직격 - 목(木) 일색
    secondary: c('amplify', 8, '🌲', 'green', '성장발전', 'Growth development'),
    solarArc: c('extreme', 9, '🌱', 'purple', '확장방향', 'Expansion direction'),
    solarReturn: c('extreme', 9, '🌿', 'purple', '시작연간', 'Beginning year'),
    lunarReturn: c('amplify', 8, '🌱', 'green', '성장월간', 'Growth month'),
    draconic: c('extreme', 9, '🌲', 'purple', '생명영혼', 'Life soul'),
    harmonics: c('extreme', 9, '🌱', 'purple', 'H3성장', 'H3 Growth'),
  },
  yeomsang: { // 염상격 - 화(火) 일색
    secondary: c('extreme', 9, '🔥', 'purple', '열정발전', 'Passion development'),
    solarArc: c('extreme', 9, '⚡', 'purple', '폭발방향', 'Explosion direction'),
    solarReturn: c('extreme', 10, '🔥', 'purple', '열정연간', 'Passion year'),
    lunarReturn: c('extreme', 8, '🔥', 'purple', '활동월간', 'Activity month'),
    draconic: c('extreme', 10, '🔥', 'purple', '불꽃영혼', 'Flame soul'),
    harmonics: c('extreme', 10, '⚡', 'purple', 'H5표현', 'H5 Express'),
  },
  gasaek: { // 가색격 - 토(土) 일색
    secondary: c('extreme', 9, '🏔️', 'purple', '안정발전', 'Stability development'),
    solarArc: c('amplify', 8, '🧱', 'green', '구축방향', 'Build direction'),
    solarReturn: c('extreme', 9, '🏠', 'purple', '정착연간', 'Settlement year'),
    lunarReturn: c('extreme', 9, '🏠', 'purple', '안정월간', 'Stability month'),
    draconic: c('extreme', 10, '🏔️', 'purple', '대지영혼', 'Earth soul'),
    harmonics: c('extreme', 9, '🏛️', 'purple', 'H4기반', 'H4 Foundation'),
  },
  jonghyeok: { // 종혁격 - 금(金) 일색
    secondary: c('amplify', 8, '⚔️', 'green', '결단발전', 'Decision development'),
    solarArc: c('extreme', 9, '💎', 'purple', '정제방향', 'Refine direction'),
    solarReturn: c('extreme', 9, '✂️', 'purple', '정리연간', 'Organize year'),
    lunarReturn: c('amplify', 8, '💎', 'green', '결실월간', 'Harvest month'),
    draconic: c('extreme', 10, '⚔️', 'purple', '검영혼', 'Sword soul'),
    harmonics: c('extreme', 9, '💎', 'purple', 'H6+H10', 'H6+H10'),
  },
  yunha: { // 윤하격 - 수(水) 일색
    secondary: c('amplify', 8, '🌊', 'green', '유동발전', 'Flow development'),
    solarArc: c('amplify', 8, '🌀', 'green', '흐름방향', 'Flow direction'),
    solarReturn: c('extreme', 9, '🌊', 'purple', '변화연간', 'Change year'),
    lunarReturn: c('extreme', 9, '🌊', 'purple', '감정월간', 'Emotion month'),
    draconic: c('extreme', 10, '🌊', 'purple', '물영혼', 'Water soul'),
    harmonics: c('extreme', 10, '🔮', 'purple', 'H12초월', 'H12 Transcend'),
  },

  // ===== 용신 (Yongsin) 오행별 =====
  yongsin_목: { // 용신이 목(木)인 경우
    secondary: c('amplify', 8, '🌱', 'green', '성장기간', 'Growth period'),
    solarArc: c('amplify', 8, '📈', 'green', '상승방향', 'Rising direction'),
    solarReturn: c('amplify', 8, '🌿', 'green', '새시작연간', 'New start year'),
    lunarReturn: c('amplify', 8, '🌱', 'green', '감정성장', 'Emotion growth'),
    draconic: c('extreme', 9, '🌲', 'purple', '생명영혼', 'Life soul'),
    harmonics: c('amplify', 8, '🎨', 'green', 'H3창의', 'H3 Creative'),
  },
  yongsin_화: { // 용신이 화(火)인 경우
    secondary: c('amplify', 8, '🔥', 'green', '활동기간', 'Activity period'),
    solarArc: c('extreme', 9, '⚡', 'purple', '가속방향', 'Accelerate direction'),
    solarReturn: c('extreme', 9, '🔥', 'purple', '열정연간', 'Passion year'),
    lunarReturn: c('extreme', 8, '🔥', 'purple', '감정폭발', 'Emotion burst'),
    draconic: c('extreme', 9, '🔥', 'purple', '열정영혼', 'Passion soul'),
    harmonics: c('extreme', 9, '✨', 'purple', 'H5표현', 'H5 Express'),
  },
  yongsin_토: { // 용신이 토(土)인 경우
    secondary: c('extreme', 9, '🏔️', 'purple', '안정기간', 'Stability period'),
    solarArc: c('amplify', 8, '🧱', 'green', '구축방향', 'Build direction'),
    solarReturn: c('amplify', 8, '🏠', 'green', '정착연간', 'Settle year'),
    lunarReturn: c('extreme', 9, '🏠', 'purple', '감정안정', 'Emotion stable'),
    draconic: c('extreme', 9, '🏔️', 'purple', '신뢰영혼', 'Trust soul'),
    harmonics: c('amplify', 8, '🏛️', 'green', 'H4+H10', 'H4+H10'),
  },
  yongsin_금: { // 용신이 금(金)인 경우
    secondary: c('amplify', 8, '✂️', 'green', '정리기간', 'Organize period'),
    solarArc: c('amplify', 8, '💎', 'green', '결정방향', 'Decision direction'),
    solarReturn: c('amplify', 8, '✨', 'green', '결실연간', 'Harvest year'),
    lunarReturn: c('amplify', 8, '✂️', 'green', '감정정리', 'Emotion organize'),
    draconic: c('extreme', 9, '⚔️', 'purple', '결단영혼', 'Decisive soul'),
    harmonics: c('amplify', 8, '📊', 'green', 'H6+H10', 'H6+H10'),
  },
  yongsin_수: { // 용신이 수(水)인 경우
    secondary: c('amplify', 8, '🌊', 'green', '유동기간', 'Flow period'),
    solarArc: c('amplify', 7, '🌀', 'green', '변화방향', 'Change direction'),
    solarReturn: c('amplify', 8, '🌊', 'green', '흐름연간', 'Flow year'),
    lunarReturn: c('extreme', 9, '🌊', 'purple', '감정흐름', 'Emotion flow'),
    draconic: c('extreme', 9, '🌊', 'purple', '지혜영혼', 'Wisdom soul'),
    harmonics: c('extreme', 9, '🔮', 'purple', 'H8+H12', 'H8+H12'),
  },
};

// 격국 설명 (19개 전체)
export const GEOKGUK_INFO = {
  // 정격 8종
  jeonggwan: {
    ko: '정관격 (正官格) - 정당한 권위와 사회적 명예를 추구하는 격국',
    en: 'Regular Authority Pattern - Pursues legitimate authority and social honor',
    traits: ['책임감', '명예욕', '조직적'],
    traitsEn: ['Responsible', 'Honor-seeking', 'Organized'],
    sibsin: '정관',
  },
  pyeongwan: {
    ko: '편관격 (偏官格/칠살격) - 강력한 권력과 도전을 추구하는 격국',
    en: 'Partial Authority Pattern - Pursues strong power and challenges',
    traits: ['도전적', '권력지향', '강인함'],
    traitsEn: ['Challenging', 'Power-oriented', 'Strong'],
    sibsin: '편관/칠살',
  },
  jeongin: {
    ko: '정인격 (正印格) - 학문과 지혜, 어머니의 보살핌을 받는 격국',
    en: 'Regular Seal Pattern - Receives scholarship, wisdom, and maternal care',
    traits: ['학구적', '신중함', '보살핌'],
    traitsEn: ['Scholarly', 'Prudent', 'Caring'],
    sibsin: '정인',
  },
  pyeongin: {
    ko: '편인격 (偏印格) - 특수 재능과 영적 능력을 가진 격국',
    en: 'Partial Seal Pattern - Has special talents and spiritual abilities',
    traits: ['특이함', '영성', '고독'],
    traitsEn: ['Unique', 'Spiritual', 'Solitary'],
    sibsin: '편인',
  },
  siksin: {
    ko: '식신격 (食神格) - 표현력과 복록이 풍부한 격국',
    en: 'Eating God Pattern - Rich in expression and fortune',
    traits: ['표현력', '풍요', '온화함'],
    traitsEn: ['Expressive', 'Abundant', 'Gentle'],
    sibsin: '식신',
  },
  sanggwan: {
    ko: '상관격 (傷官格) - 뛰어난 재능과 반항심을 가진 격국',
    en: 'Hurting Officer Pattern - Has outstanding talent and rebelliousness',
    traits: ['재능', '반항심', '표현욕'],
    traitsEn: ['Talented', 'Rebellious', 'Expressive'],
    sibsin: '상관',
  },
  jeongjae: {
    ko: '정재격 (正財格) - 안정적인 재물 축적을 하는 격국',
    en: 'Regular Wealth Pattern - Accumulates stable wealth',
    traits: ['성실함', '안정적', '가정적'],
    traitsEn: ['Diligent', 'Stable', 'Family-oriented'],
    sibsin: '정재',
  },
  pyeonjae: {
    ko: '편재격 (偏財格) - 유동적인 재물과 사업 수완이 있는 격국',
    en: 'Partial Wealth Pattern - Has fluid wealth and business acumen',
    traits: ['사업가', '활동적', '대인관계'],
    traitsEn: ['Entrepreneur', 'Active', 'Sociable'],
    sibsin: '편재',
  },
  // 특수격 2종
  geonrok: {
    ko: '건록격 (建祿格) - 자수성가하는 강한 자립심의 격국',
    en: 'Building Fortune Pattern - Self-made with strong independence',
    traits: ['자립심', '독립적', '활동적'],
    traitsEn: ['Self-reliant', 'Independent', 'Active'],
    sibsin: '비견/건록',
  },
  yangin: {
    ko: '양인격 (羊刃格) - 강렬한 결단력과 추진력의 격국',
    en: 'Blade Pattern - Intense determination and drive',
    traits: ['결단력', '추진력', '위험성'],
    traitsEn: ['Decisive', 'Driven', 'Risky'],
    sibsin: '겁재/양인',
  },
  // 종격 4종
  jonga: {
    ko: '종아격 (從兒格) - 식상(자녀운)을 따르는 순종의 격국',
    en: 'Following Child Pattern - Follows food/expression energy',
    traits: ['창작', '표현', '자유로움'],
    traitsEn: ['Creative', 'Expressive', 'Free'],
    sibsin: '식상 종',
  },
  jongjae: {
    ko: '종재격 (從財格) - 재성(재물운)을 따르는 순종의 격국',
    en: 'Following Wealth Pattern - Follows wealth energy',
    traits: ['재물복', '현실적', '사업적'],
    traitsEn: ['Wealthy', 'Practical', 'Business-minded'],
    sibsin: '재성 종',
  },
  jongsal: {
    ko: '종살격 (從殺格) - 관성(권위)을 따르는 순종의 격국',
    en: 'Following Authority Pattern - Follows authority energy',
    traits: ['권위', '복종', '조직적'],
    traitsEn: ['Authoritative', 'Obedient', 'Organized'],
    sibsin: '관성 종',
  },
  jonggang: {
    ko: '종강격 (從强格) - 비겁(형제운)을 따르는 순종의 격국',
    en: 'Following Strength Pattern - Follows peer energy',
    traits: ['협력', '경쟁', '동료애'],
    traitsEn: ['Cooperative', 'Competitive', 'Collegial'],
    sibsin: '비겁 종',
  },
  // 외격 5종
  gokjik: {
    ko: '곡직격 (曲直格) - 목(木) 일색으로 성장과 인의의 격국',
    en: 'Curved Straight Pattern - Wood dominant, growth and benevolence',
    traits: ['성장', '인의', '확장'],
    traitsEn: ['Growth', 'Benevolent', 'Expansive'],
    element: '목(木)',
  },
  yeomsang: {
    ko: '염상격 (炎上格) - 화(火) 일색으로 열정과 예의의 격국',
    en: 'Flame Rising Pattern - Fire dominant, passion and propriety',
    traits: ['열정', '예의', '명예'],
    traitsEn: ['Passionate', 'Proper', 'Honorable'],
    element: '화(火)',
  },
  gasaek: {
    ko: '가색격 (稼穡格) - 토(土) 일색으로 안정과 신의의 격국',
    en: 'Farming Pattern - Earth dominant, stability and trust',
    traits: ['안정', '신의', '중재'],
    traitsEn: ['Stable', 'Trustworthy', 'Mediating'],
    element: '토(土)',
  },
  jonghyeok: {
    ko: '종혁격 (從革格) - 금(金) 일색으로 결단과 의리의 격국',
    en: 'Following Reform Pattern - Metal dominant, decision and loyalty',
    traits: ['결단', '의리', '정제'],
    traitsEn: ['Decisive', 'Loyal', 'Refined'],
    element: '금(金)',
  },
  yunha: {
    ko: '윤하격 (潤下格) - 수(水) 일색으로 지혜와 유연성의 격국',
    en: 'Moistening Down Pattern - Water dominant, wisdom and flexibility',
    traits: ['지혜', '유연', '적응'],
    traitsEn: ['Wise', 'Flexible', 'Adaptable'],
    element: '수(水)',
  },
} as const;

// 프로그레션 타입 설명
export const PROGRESSION_INFO = {
  secondary: {
    ko: '세컨더리 프로그레션 - 하루 = 1년 법칙. 내적 발전과 심리적 성숙을 보여줌',
    en: 'Secondary Progression - One day = one year. Shows inner development and psychological maturity',
    timeframe: '장기 (수십 년)',
    timeframeEn: 'Long-term (decades)',
  },
  solarArc: {
    ko: '솔라 아크 - 프로그레스 태양과 출생 태양의 차이만큼 모든 행성 이동. 외적 이벤트와 방향성',
    en: 'Solar Arc - All planets move by progressed Sun distance. External events and direction',
    timeframe: '장기 (수십 년)',
    timeframeEn: 'Long-term (decades)',
  },
  solarReturn: {
    ko: '솔라 리턴 - 태양이 출생 위치로 돌아오는 연간 차트. 그 해의 테마와 에너지',
    en: 'Solar Return - Annual chart when Sun returns to birth position. Year\'s themes and energy',
    timeframe: '연간 (1년)',
    timeframeEn: 'Annual (1 year)',
  },
  lunarReturn: {
    ko: '루나 리턴 - 달이 출생 위치로 돌아오는 월간 차트. 그 달의 감정과 흐름',
    en: 'Lunar Return - Monthly chart when Moon returns to birth position. Month\'s emotions and flow',
    timeframe: '월간 (약 27.3일)',
    timeframeEn: 'Monthly (~27.3 days)',
  },
  draconic: {
    ko: '드라코닉 차트 - 노드를 0°로 재설정한 영혼 차트. 영혼의 목적과 카르마',
    en: 'Draconic Chart - Soul chart with Node reset to 0°. Soul purpose and karma',
    timeframe: '평생',
    timeframeEn: 'Lifetime',
  },
  harmonics: {
    ko: '하모닉스 - 특정 배수로 차트 확대. 숨겨진 패턴과 잠재력 발견',
    en: 'Harmonics - Chart expanded by specific multiples. Hidden patterns and potential',
    timeframe: '평생',
    timeframeEn: 'Lifetime',
  },
} as const;

// 하모닉스-사주 대응
export const HARMONICS_SAJU_MAPPING = {
  H1: { saju: '원국 (原局)', meaning: '기본 자아/본질', meaningEn: 'Basic self/Essence' },
  H2: { saju: '충 (沖)', meaning: '이원성/갈등', meaningEn: 'Duality/Conflict' },
  H3: { saju: '삼합 (三合)', meaning: '창조성/표현', meaningEn: 'Creativity/Expression' },
  H4: { saju: '형 (刑)', meaning: '노력/성취', meaningEn: 'Effort/Achievement' },
  H5: { saju: '오행 (五行)', meaning: '재능/창조', meaningEn: 'Talent/Creation' },
  H7: { saju: '칠살 (七殺)', meaning: '영성/직관', meaningEn: 'Spirituality/Intuition' },
  H8: { saju: '팔자 (八字)', meaning: '변혁/재생', meaningEn: 'Transformation/Rebirth' },
  H9: { saju: '구궁 (九宮)', meaning: '지혜/완성', meaningEn: 'Wisdom/Completion' },
  H12: { saju: '십이운성 (十二運星)', meaning: '희생/초월', meaningEn: 'Sacrifice/Transcendence' },
} as const;

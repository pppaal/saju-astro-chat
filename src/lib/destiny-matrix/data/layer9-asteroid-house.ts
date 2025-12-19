// src/lib/destiny-matrix/data/layer9-asteroid-house.ts
/**
 * ============================================================================
 * Destiny Fusion Matrix™ - Layer 9: Asteroid-House Matrix (소행성-하우스)
 * ============================================================================
 * © 2024 All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, distribution, or reverse engineering is prohibited.
 * ============================================================================
 */

import type { InteractionCode, HouseNumber, AsteroidName } from '../types';

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

// 소행성-하우스 교차 매트릭스
export const ASTEROID_HOUSE_MATRIX: Record<AsteroidName, Record<HouseNumber, InteractionCode>> = {
  // Ceres (세레스) - 양육, 어머니, 풍요, 상실과 재회
  Ceres: {
    1: c('amplify', 8, '🤱', 'green', '양육자아', 'Nurturing self'),
    2: c('amplify', 8, '🌾', 'green', '물질풍요', 'Material abundance'),
    3: c('amplify', 7, '📝', 'green', '양육소통', 'Nurturing communication'),
    4: c('extreme', 10, '🏠', 'purple', '세레스본궁', 'Ceres home house'),
    5: c('amplify', 8, '👶', 'green', '자녀양육', 'Child nurturing'),
    6: c('amplify', 8, '🍽️', 'green', '건강음식', 'Health food'),
    7: c('amplify', 7, '💕', 'green', '파트너양육', 'Partner nurturing'),
    8: c('clash', 5, '😢', 'yellow', '상실재회', 'Loss reunion'),
    9: c('amplify', 7, '🌍', 'green', '문화양육', 'Cultural nurturing'),
    10: c('amplify', 8, '👩‍💼', 'green', '사회양육', 'Social nurturing'),
    11: c('amplify', 7, '🤝', 'green', '공동체양육', 'Community nurturing'),
    12: c('clash', 5, '😔', 'yellow', '숨은양육', 'Hidden nurturing'),
  },

  // Pallas (팔라스) - 지혜, 전략, 정의, 창조적 지성
  Pallas: {
    1: c('amplify', 8, '🧠', 'green', '전략자아', 'Strategic self'),
    2: c('amplify', 7, '💰', 'green', '전략재물', 'Strategic wealth'),
    3: c('extreme', 9, '📊', 'purple', '분석소통', 'Analytical communication'),
    4: c('amplify', 7, '🏠', 'green', '가정전략', 'Home strategy'),
    5: c('amplify', 8, '🎨', 'green', '창조전략', 'Creative strategy'),
    6: c('extreme', 9, '📋', 'purple', '업무전략', 'Work strategy'),
    7: c('amplify', 8, '⚖️', 'green', '관계정의', 'Relation justice'),
    8: c('amplify', 8, '🔍', 'green', '심층전략', 'Deep strategy'),
    9: c('extreme', 9, '🎓', 'purple', '팔라스본궁', 'Pallas home house'),
    10: c('extreme', 9, '🏛️', 'purple', '사회전략', 'Social strategy'),
    11: c('amplify', 8, '💡', 'green', '혁신전략', 'Innovation strategy'),
    12: c('amplify', 7, '🔮', 'green', '직관전략', 'Intuitive strategy'),
  },

  // Juno (주노) - 결혼, 헌신, 파트너십, 평등
  Juno: {
    1: c('amplify', 8, '💍', 'green', '헌신자아', 'Devoted self'),
    2: c('amplify', 7, '💰', 'green', '공동재물', 'Shared wealth'),
    3: c('amplify', 7, '💬', 'green', '파트너소통', 'Partner communication'),
    4: c('amplify', 8, '🏠', 'green', '가정헌신', 'Home devotion'),
    5: c('amplify', 7, '💕', 'green', '연애헌신', 'Romance devotion'),
    6: c('amplify', 7, '🤝', 'green', '업무파트너', 'Work partner'),
    7: c('extreme', 10, '💒', 'purple', '주노본궁', 'Juno home house'),
    8: c('amplify', 8, '🔗', 'green', '깊은결합', 'Deep bonding'),
    9: c('amplify', 7, '🌍', 'green', '문화파트너', 'Cultural partner'),
    10: c('amplify', 8, '👔', 'green', '사회파트너', 'Social partner'),
    11: c('amplify', 7, '🤝', 'green', '친구파트너', 'Friend partner'),
    12: c('clash', 5, '💔', 'yellow', '숨은인연', 'Hidden connection'),
  },

  // Vesta (베스타) - 헌신, 집중, 영적 봉사, 순결
  Vesta: {
    1: c('amplify', 8, '🔥', 'green', '집중자아', 'Focused self'),
    2: c('amplify', 7, '💎', 'green', '가치집중', 'Value focus'),
    3: c('amplify', 7, '📚', 'green', '학습집중', 'Study focus'),
    4: c('amplify', 8, '🏠', 'green', '가정헌신', 'Home dedication'),
    5: c('amplify', 8, '🎨', 'green', '창작집중', 'Creative focus'),
    6: c('extreme', 10, '🔥', 'purple', '베스타본궁', 'Vesta home house'),
    7: c('clash', 5, '⚖️', 'yellow', '관계독립', 'Relation independence'),
    8: c('amplify', 8, '🔮', 'green', '심층헌신', 'Deep dedication'),
    9: c('amplify', 8, '🙏', 'green', '영적헌신', 'Spiritual dedication'),
    10: c('extreme', 9, '🏛️', 'purple', '직업헌신', 'Career dedication'),
    11: c('amplify', 7, '🌟', 'green', '이상헌신', 'Ideal dedication'),
    12: c('extreme', 9, '🧘', 'purple', '명상집중', 'Meditation focus'),
  },
};

// 소행성-오행 교차 (사주와의 연결)
export const ASTEROID_ELEMENT_MATRIX: Record<AsteroidName, Record<string, InteractionCode>> = {
  Ceres: {
    '목': c('extreme', 9, '🌱', 'purple', '성장양육', 'Growth nurturing'),
    '화': c('clash', 5, '🔥', 'yellow', '열정양육', 'Passion nurturing'),
    '토': c('extreme', 10, '🏔️', 'purple', '안정양육', 'Stable nurturing'),
    '금': c('amplify', 7, '✂️', 'green', '절제양육', 'Restrained nurturing'),
    '수': c('amplify', 8, '💧', 'green', '감성양육', 'Emotional nurturing'),
  },
  Pallas: {
    '목': c('amplify', 8, '📈', 'green', '성장전략', 'Growth strategy'),
    '화': c('extreme', 9, '⚡', 'purple', '행동전략', 'Action strategy'),
    '토': c('amplify', 8, '📊', 'green', '체계전략', 'System strategy'),
    '금': c('extreme', 10, '⚔️', 'purple', '결단전략', 'Decision strategy'),
    '수': c('extreme', 9, '🧠', 'purple', '지혜전략', 'Wisdom strategy'),
  },
  Juno: {
    '목': c('amplify', 8, '🌱', 'green', '성장파트너', 'Growth partner'),
    '화': c('extreme', 9, '❤️‍🔥', 'purple', '열정파트너', 'Passion partner'),
    '토': c('extreme', 9, '🏠', 'purple', '안정파트너', 'Stable partner'),
    '금': c('amplify', 7, '💍', 'green', '충실파트너', 'Loyal partner'),
    '수': c('amplify', 8, '💕', 'green', '감성파트너', 'Emotional partner'),
  },
  Vesta: {
    '목': c('amplify', 8, '🌱', 'green', '성장헌신', 'Growth dedication'),
    '화': c('extreme', 10, '🔥', 'purple', '열정헌신', 'Passion dedication'),
    '토': c('amplify', 8, '🏔️', 'green', '안정헌신', 'Stable dedication'),
    '금': c('extreme', 9, '⚔️', 'purple', '순결헌신', 'Pure dedication'),
    '수': c('amplify', 8, '🧘', 'green', '명상헌신', 'Meditation dedication'),
  },
};

// 소행성 정보
export const ASTEROID_INFO: Record<AsteroidName, {
  ko: string;
  en: string;
  symbol: string;
  theme: string;
  themeEn: string;
  keywords: string[];
  keywordsEn: string[];
}> = {
  Ceres: {
    ko: '세레스',
    en: 'Ceres',
    symbol: '⚳',
    theme: '양육, 어머니, 풍요, 상실과 재회',
    themeEn: 'Nurturing, Mother, Abundance, Loss and Reunion',
    keywords: ['양육', '어머니', '음식', '풍요', '상실', '재회', '보살핌'],
    keywordsEn: ['Nurturing', 'Mother', 'Food', 'Abundance', 'Loss', 'Reunion', 'Care'],
  },
  Pallas: {
    ko: '팔라스',
    en: 'Pallas',
    symbol: '⚴',
    theme: '지혜, 전략, 정의, 창조적 지성',
    themeEn: 'Wisdom, Strategy, Justice, Creative Intelligence',
    keywords: ['지혜', '전략', '정의', '패턴인식', '예술', '정치', '치유'],
    keywordsEn: ['Wisdom', 'Strategy', 'Justice', 'Pattern', 'Art', 'Politics', 'Healing'],
  },
  Juno: {
    ko: '주노',
    en: 'Juno',
    symbol: '⚵',
    theme: '결혼, 헌신, 파트너십, 평등',
    themeEn: 'Marriage, Commitment, Partnership, Equality',
    keywords: ['결혼', '헌신', '파트너십', '평등', '질투', '배신', '충실'],
    keywordsEn: ['Marriage', 'Commitment', 'Partnership', 'Equality', 'Jealousy', 'Betrayal', 'Loyalty'],
  },
  Vesta: {
    ko: '베스타',
    en: 'Vesta',
    symbol: '⚶',
    theme: '헌신, 집중, 영적 봉사, 순결',
    themeEn: 'Dedication, Focus, Spiritual Service, Purity',
    keywords: ['헌신', '집중', '봉사', '순결', '독립', '영성', '제의'],
    keywordsEn: ['Dedication', 'Focus', 'Service', 'Purity', 'Independence', 'Spirituality', 'Ritual'],
  },
};

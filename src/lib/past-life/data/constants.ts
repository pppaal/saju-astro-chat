/**
 * Constants for past-life analysis
 */

import type { GeokgukType } from './types';

const GEOKGUK_TALENTS: Record<GeokgukType, { ko: string; en: string }[]> = {
  siksin: [
    { ko: "창작 능력", en: "Creative ability" },
    { ko: "미적 감각", en: "Aesthetic sense" },
    { ko: "요리/음식", en: "Cooking/Food" },
    { ko: "글쓰기", en: "Writing" },
    { ko: "디자인 감각", en: "Design sense" },
  ],
  sanggwan: [
    { ko: "언변", en: "Eloquence" },
    { ko: "퍼포먼스", en: "Performance" },
    { ko: "영향력", en: "Influence" },
    { ko: "대중 연설", en: "Public speaking" },
    { ko: "혁신적 사고", en: "Innovative thinking" },
  ],
  jeonggwan: [
    { ko: "조직력", en: "Organization" },
    { ko: "공정함", en: "Fairness" },
    { ko: "리더십", en: "Leadership" },
    { ko: "전략적 사고", en: "Strategic thinking" },
    { ko: "위기 관리", en: "Crisis management" },
  ],
  pyeongwan: [
    { ko: "용기", en: "Courage" },
    { ko: "결단력", en: "Determination" },
    { ko: "실행력", en: "Execution" },
    { ko: "위기 대처", en: "Crisis response" },
    { ko: "보호 본능", en: "Protective instinct" },
  ],
  jeongjae: [
    { ko: "재정 관리", en: "Financial management" },
    { ko: "실용성", en: "Practicality" },
    { ko: "안정감", en: "Stability" },
    { ko: "자원 관리", en: "Resource management" },
    { ko: "신뢰 구축", en: "Trust building" },
  ],
  pyeonjae: [
    { ko: "기회 포착", en: "Opportunity spotting" },
    { ko: "적응력", en: "Adaptability" },
    { ko: "네트워킹", en: "Networking" },
    { ko: "위험 감수", en: "Risk-taking" },
    { ko: "다문화 이해", en: "Cross-cultural understanding" },
  ],
  jeongin: [
    { ko: "학습 능력", en: "Learning ability" },
    { ko: "가르침", en: "Teaching" },
    { ko: "인내", en: "Patience" },
    { ko: "연구 능력", en: "Research ability" },
    { ko: "지식 전달", en: "Knowledge transfer" },
  ],
  pyeongin: [
    { ko: "직관력", en: "Intuition" },
    { ko: "영성", en: "Spirituality" },
    { ko: "통찰력", en: "Insight" },
    { ko: "상징 해석", en: "Symbol interpretation" },
    { ko: "치유 능력", en: "Healing ability" },
  ],
};

// 격국 이름 매핑 (한글 → 영문 타입)
const GEOKGUK_NAME_MAPPING: Record<string, GeokgukType> = {
  '식신': 'siksin',
  '식신격': 'siksin',
  '상관': 'sanggwan',
  '상관격': 'sanggwan',
  '정관': 'jeonggwan',
  '정관격': 'jeonggwan',
  '편관': 'pyeongwan',
  '편관격': 'pyeongwan',
  '칠살': 'pyeongwan',
  '정재': 'jeongjae',
  '정재격': 'jeongjae',
  '편재': 'pyeonjae',
  '편재격': 'pyeonjae',
  '정인': 'jeongin',
  '정인격': 'jeongin',
  '편인': 'pyeongin',
  '편인격': 'pyeongin',
};

// 카르마 부채 설정
const KARMIC_DEBT_CONFIG = {
  MAX_ITEMS: 4,
  PATTERNS: {
    '원진': {
      ko: { area: "관계 카르마", description: "전생에서 해결하지 못한 관계의 갈등이 있어요. 특정 사람과의 충돌이 반복될 수 있어요.", healing: "용서하고 이해하려 노력하세요" },
      en: { area: "Relationship Karma", description: "Unresolved relationship conflicts from past lives. Conflicts with certain people may repeat.", healing: "Try to forgive and understand" }
    },
    '공망': {
      ko: { area: "공허 카르마", description: "전생에서 무언가를 잃은 경험이 깊이 남아있어요. 특정 영역에서 공허함을 느낄 수 있어요.", healing: "내면을 채우는 영적 수행을 하세요" },
      en: { area: "Emptiness Karma", description: "Deep experience of loss from past lives remains. You may feel emptiness in certain areas.", healing: "Practice spiritual cultivation to fill your inner self" }
    },
    '겁살': {
      ko: { area: "도전 카르마", description: "전생에서 극복하지 못한 도전이 다시 찾아와요. 어려움이 성장의 기회임을 기억하세요.", healing: "두려움을 직면하고 극복하세요" },
      en: { area: "Challenge Karma", description: "Challenges not overcome in past lives return. Remember difficulties are growth opportunities.", healing: "Face and overcome your fears" }
    },
    '도화': {
      ko: { area: "매력 카르마", description: "전생에서 매력과 관계를 통해 배워야 할 교훈이 있어요. 인간관계에서 경계를 배워야 해요.", healing: "진정한 사랑과 건강한 관계의 균형을 찾으세요" },
      en: { area: "Charm Karma", description: "Lessons to learn through attraction and relationships from past lives. You need to learn boundaries in relationships.", healing: "Find balance between true love and healthy relationships" }
    },
    '역마': {
      ko: { area: "이동 카르마", description: "전생에서 정착하지 못하고 떠돌았던 영혼이에요. 한 곳에 뿌리내리는 것이 이번 생의 과제예요.", healing: "안정과 자유 사이의 균형을 찾으세요" },
      en: { area: "Movement Karma", description: "A soul that wandered without settling in past lives. Putting down roots is your challenge this life.", healing: "Find balance between stability and freedom" }
    },
    '화개': {
      ko: { area: "영적 카르마", description: "전생에서 영적인 수행을 했던 영혼이에요. 세속과 영성의 균형을 찾아야 해요.", healing: "일상 속에서 영성을 실천하세요" },
      en: { area: "Spiritual Karma", description: "A soul that practiced spiritually in past lives. You need to find balance between secular and spiritual.", healing: "Practice spirituality in everyday life" }
    },
    '백호': {
      ko: { area: "권력 카르마", description: "전생에서 권력이나 힘을 남용했을 수 있어요. 이번 생에서는 힘을 선하게 쓰는 법을 배워요.", healing: "힘을 보호와 봉사를 위해 사용하세요" },
      en: { area: "Power Karma", description: "You may have misused power or authority in past lives. This life, learn to use power for good.", healing: "Use your power for protection and service" }
    },
    '괴강': {
      ko: { area: "강인함 카르마", description: "전생에서 극단적인 상황을 경험한 영혼이에요. 유연성과 부드러움을 배워야 해요.", healing: "강함 속에서 부드러움을 찾으세요" },
      en: { area: "Strength Karma", description: "A soul that experienced extreme situations in past lives. You need to learn flexibility and gentleness.", healing: "Find softness within your strength" }
    },
    '양인': {
      ko: { area: "결단 카르마", description: "전생에서 날카로운 결단으로 상처를 줬을 수 있어요. 신중함과 배려를 배워야 해요.", healing: "결정할 때 다른 사람의 입장도 고려하세요" },
      en: { area: "Decision Karma", description: "You may have hurt others with sharp decisions in past lives. You need to learn prudence and consideration.", healing: "Consider others' positions when making decisions" }
    },
  }
} as const;

// 토성 회귀 나이
const SATURN_RETURN_AGES = {
  FIRST: 29,
  SECOND: 58,
} as const;

// 카르마 패턴 매칭 (한글 + 한자)
const KARMIC_PATTERN_MATCHERS: Record<string, string[]> = {
  '원진': ['원진', '元嗔'],
  '공망': ['공망', '空亡'],
  '겁살': ['겁살', '劫殺'],
  '도화': ['도화', '桃花'],
  '역마': ['역마', '驛馬'],
  '화개': ['화개', '華蓋'],
  '백호': ['백호', '白虎'],
  '괴강': ['괴강', '魁罡'],
  '양인': ['양인', '羊刃'],
};

// 유효한 천간 (Heavenly Stems)
const VALID_HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;

// 행성 이름 별칭
const PLANET_ALIASES = {
  northNode: ['north', 'northnode'],
  saturn: ['saturn'],
} as const;

// 폴백 이중언어 텍스트
const FALLBACK_TEXTS = {
  PAST_LIFE: {
    likely: { ko: "다양한 역할을 경험한 영혼입니다.", en: "A soul that experienced various roles." },
    talents: { ko: "전생에서 쌓은 다양한 재능이 있어요.", en: "You have diverse talents from past lives." },
    lessons: { ko: "과거의 패턴을 인식하고 성장하세요.", en: "Recognize past patterns and grow." },
  },
  SOUL_JOURNEY: {
    pastPattern: { ko: "전생의 패턴이 현재에 영향을 미치고 있어요", en: "Past life patterns influence the present" },
    releasePattern: { ko: "오래된 습관과 집착", en: "Old habits and attachments" },
    currentDirection: { ko: "새로운 성장의 방향으로", en: "Toward new growth" },
    lessonToLearn: { ko: "변화를 받아들이고 성장하기", en: "Accepting change and growing" },
  },
  SATURN_LESSON: {
    lesson: { ko: "인생의 중요한 교훈이 기다리고 있어요", en: "Important life lessons await" },
    mastery: { ko: "나이 들수록 더 강해지고 현명해져요", en: "You grow stronger and wiser with age" },
  },
  THIS_LIFE_MISSION: {
    core: { ko: "당신만의 빛으로 세상을 밝히세요", en: "Light the world with your unique light" },
    expression: { ko: "자신에게 충실하면 길이 열려요", en: "Being true to yourself opens the path" },
    fulfillment: { ko: "진정한 나로 살 때 가장 행복해요", en: "Happiest when living as your true self" },
  },
  DEFAULT_TALENTS: [
    { ko: "적응력", en: "Adaptability" },
    { ko: "학습 능력", en: "Learning ability" },

export const PLANET_ALIASES = {
  northNode: ['North Node', 'northnode', 'true node'],
  saturn: ['Saturn', 'saturn']
} as const;

export const KARMA_SCORE_CONFIG = {
  BASE_SCORE: 50,
  MAX_SCORE: 100,
  MIN_SCORE: 0,
  BONUS: {
    GEOKGUK: 10,
    NORTH_NODE: 10,
    SATURN: 10,
    DAY_MASTER: 10,
    PER_KARMIC_DEBT: 5,
  }
} as const;

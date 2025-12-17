// src/lib/destiny-matrix/data/layer2-sibsin-planet.ts
// Layer 2: Sibsin-Planet Matrix (십신-행성 역할 매트릭스)

import type { SibsinPlanetMatrix, InteractionCode, PlanetName } from '../types';
import type { SibsinKind } from '../../Saju/types';

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

// 십신-행성 상호작용 매핑
// 비견: 자아/동류 - Sun과 동질, Mars와 경쟁
// 겁재: 경쟁/충동 - Mars와 극강, Saturn과 억압
// 식신: 표현/창조 - Venus와 예술, Mercury와 창작
// 상관: 반항/날카로움 - Uranus와 파괴, Saturn과 좌절
// 편재: 투기/변덕 - Jupiter와 횡재, Neptune과 낭비
// 정재: 안정/저축 - Saturn과 저축, Venus와 결혼
// 편관: 권위/압박 - Saturn과 구속, Pluto와 폭력
// 정관: 명예/책임 - Saturn과 성취, Jupiter와 지위
// 편인: 편학/직관 - Neptune과 영성, Uranus와 발명
// 정인: 정학/양육 - Moon과 양육, Jupiter와 학위

export const SIBSIN_PLANET_MATRIX: SibsinPlanetMatrix = {
  '비견': {
    Sun: c('extreme', 9, '💪', 'purple', '동질', 'Kindred'),
    Moon: c('amplify', 7, '⚡', 'green', '자극', 'Stimulate'),
    Mercury: c('balance', 6, '🔄', 'blue', '중립', 'Neutral'),
    Venus: c('balance', 6, '⚖️', 'blue', '조화', 'Harmony'),
    Mars: c('clash', 4, '💥', 'yellow', '경쟁', 'Compete'),
    Jupiter: c('amplify', 8, '🚀', 'green', '확장', 'Expand'),
    Saturn: c('clash', 4, '🏔️', 'yellow', '제한', 'Limit'),
    Uranus: c('amplify', 7, '⚡', 'green', '혁신', 'Innovate'),
    Neptune: c('clash', 4, '🌀', 'yellow', '혼란', 'Confuse'),
    Pluto: c('amplify', 7, '🔥', 'green', '변혁', 'Transform'),
  },
  '겁재': {
    Sun: c('clash', 4, '⚡', 'yellow', '충돌', 'Clash'),
    Moon: c('clash', 4, '🌀', 'yellow', '불안', 'Anxiety'),
    Mercury: c('clash', 4, '💨', 'yellow', '분산', 'Scatter'),
    Venus: c('conflict', 3, '❌', 'red', '갈등', 'Conflict'),
    Mars: c('extreme', 9, '💥', 'purple', '극강', 'Extreme'),
    Jupiter: c('balance', 5, '🔄', 'blue', '도박', 'Gamble'),
    Saturn: c('conflict', 2, '❌', 'red', '억압', 'Suppress'),
    Uranus: c('extreme', 8, '💥', 'purple', '폭발', 'Explode'),
    Neptune: c('clash', 4, '🌊', 'yellow', '몽상', 'Daydream'),
    Pluto: c('conflict', 2, '☠️', 'red', '위험', 'Danger'),
  },
  '식신': {
    Sun: c('amplify', 8, '✨', 'green', '표현', 'Express'),
    Moon: c('amplify', 8, '💕', 'green', '감성', 'Emotion'),
    Mercury: c('amplify', 8, '📝', 'green', '창작', 'Create'),
    Venus: c('extreme', 9, '🎨', 'purple', '예술', 'Art'),
    Mars: c('amplify', 7, '💪', 'green', '실행', 'Execute'),
    Jupiter: c('amplify', 8, '🚀', 'green', '성장', 'Grow'),
    Saturn: c('balance', 6, '⚖️', 'blue', '절제', 'Moderation'),
    Uranus: c('amplify', 8, '💡', 'green', '독창', 'Original'),
    Neptune: c('amplify', 8, '🎭', 'green', '영감', 'Inspire'),
    Pluto: c('amplify', 7, '🔮', 'green', '심층', 'Deep'),
  },
  '상관': {
    Sun: c('clash', 4, '💥', 'yellow', '반항', 'Rebel'),
    Moon: c('clash', 4, '😢', 'yellow', '감정', 'Emotional'),
    Mercury: c('clash', 5, '⚡', 'yellow', '날카', 'Sharp'),
    Venus: c('clash', 4, '💔', 'yellow', '갈망', 'Yearn'),
    Mars: c('amplify', 7, '🔥', 'green', '공격', 'Attack'),
    Jupiter: c('clash', 5, '📢', 'yellow', '과장', 'Exaggerate'),
    Saturn: c('conflict', 2, '❌', 'red', '좌절', 'Frustrate'),
    Uranus: c('clash', 5, '⚡', 'yellow', '파괴', 'Destroy'),
    Neptune: c('clash', 4, '🌀', 'yellow', '환상', 'Fantasy'),
    Pluto: c('conflict', 3, '☠️', 'red', '극단', 'Extreme'),
  },
  '편재': {
    Sun: c('amplify', 7, '💰', 'green', '투기', 'Speculate'),
    Moon: c('clash', 5, '🎲', 'yellow', '변덕', 'Fickle'),
    Mercury: c('amplify', 7, '💼', 'green', '사업', 'Business'),
    Venus: c('amplify', 8, '💕', 'green', '연애', 'Romance'),
    Mars: c('amplify', 7, '💪', 'green', '쟁취', 'Seize'),
    Jupiter: c('extreme', 9, '🎰', 'purple', '횡재', 'Windfall'),
    Saturn: c('balance', 5, '⚖️', 'blue', '손실', 'Loss'),
    Uranus: c('amplify', 7, '💡', 'green', '투자', 'Invest'),
    Neptune: c('clash', 4, '🌊', 'yellow', '낭비', 'Waste'),
    Pluto: c('amplify', 7, '🔥', 'green', '집착', 'Obsess'),
  },
  '정재': {
    Sun: c('amplify', 7, '💰', 'green', '안정', 'Stable'),
    Moon: c('amplify', 8, '🏠', 'green', '가정', 'Home'),
    Mercury: c('amplify', 7, '📊', 'green', '관리', 'Manage'),
    Venus: c('extreme', 9, '💕', 'purple', '결혼', 'Marriage'),
    Mars: c('amplify', 7, '💼', 'green', '노력', 'Effort'),
    Jupiter: c('amplify', 8, '📈', 'green', '성장', 'Growth'),
    Saturn: c('amplify', 8, '🏦', 'green', '저축', 'Save'),
    Uranus: c('balance', 5, '⚖️', 'blue', '변화', 'Change'),
    Neptune: c('clash', 4, '🌀', 'yellow', '소비', 'Spend'),
    Pluto: c('amplify', 7, '💎', 'green', '축적', 'Accumulate'),
  },
  '편관': {
    Sun: c('clash', 5, '⚔️', 'yellow', '권력', 'Power'),
    Moon: c('clash', 4, '😰', 'yellow', '압박', 'Pressure'),
    Mercury: c('balance', 5, '📋', 'blue', '규칙', 'Rules'),
    Venus: c('conflict', 3, '❌', 'red', '냉정', 'Cold'),
    Mars: c('extreme', 8, '💥', 'purple', '싸움', 'Fight'),
    Jupiter: c('balance', 6, '⚖️', 'blue', '정의', 'Justice'),
    Saturn: c('conflict', 2, '🔒', 'red', '구속', 'Restrain'),
    Uranus: c('clash', 5, '💥', 'yellow', '반란', 'Revolt'),
    Neptune: c('clash', 4, '🌀', 'yellow', '회피', 'Avoid'),
    Pluto: c('conflict', 2, '☠️', 'red', '폭력', 'Violence'),
  },
  '정관': {
    Sun: c('amplify', 8, '👔', 'green', '명예', 'Honor'),
    Moon: c('amplify', 7, '🙏', 'green', '책임', 'Duty'),
    Mercury: c('amplify', 7, '📚', 'green', '학문', 'Scholar'),
    Venus: c('amplify', 8, '💍', 'green', '헌신', 'Devotion'),
    Mars: c('balance', 6, '⚖️', 'blue', '절제', 'Restraint'),
    Jupiter: c('extreme', 9, '🏛️', 'purple', '지위', 'Status'),
    Saturn: c('extreme', 9, '🎖️', 'purple', '성취', 'Achieve'),
    Uranus: c('balance', 5, '⚖️', 'blue', '개혁', 'Reform'),
    Neptune: c('amplify', 7, '🙏', 'green', '봉사', 'Serve'),
    Pluto: c('amplify', 7, '🔱', 'green', '권위', 'Authority'),
  },
  '편인': {
    Sun: c('amplify', 7, '🎓', 'green', '편학', 'Eccentric'),
    Moon: c('amplify', 8, '💭', 'green', '직관', 'Intuition'),
    Mercury: c('amplify', 7, '🔮', 'green', '신비', 'Mystery'),
    Venus: c('amplify', 7, '🎨', 'green', '감각', 'Sense'),
    Mars: c('clash', 5, '⚡', 'yellow', '충동', 'Impulse'),
    Jupiter: c('amplify', 8, '📖', 'green', '철학', 'Philosophy'),
    Saturn: c('amplify', 7, '🧠', 'green', '연구', 'Research'),
    Uranus: c('extreme', 9, '💡', 'purple', '발명', 'Invent'),
    Neptune: c('extreme', 9, '🌀', 'purple', '영성', 'Spiritual'),
    Pluto: c('amplify', 8, '🔮', 'green', '심령', 'Psychic'),
  },
  '정인': {
    Sun: c('amplify', 7, '📚', 'green', '정학', 'Orthodox'),
    Moon: c('extreme', 9, '🤱', 'purple', '양육', 'Nurture'),
    Mercury: c('amplify', 8, '📖', 'green', '교육', 'Educate'),
    Venus: c('amplify', 8, '💕', 'green', '사랑', 'Love'),
    Mars: c('amplify', 7, '🛡️', 'green', '보호', 'Protect'),
    Jupiter: c('extreme', 9, '🏫', 'purple', '학위', 'Degree'),
    Saturn: c('amplify', 8, '📜', 'green', '자격', 'Qualify'),
    Uranus: c('balance', 5, '⚖️', 'blue', '혁신', 'Innovate'),
    Neptune: c('amplify', 7, '🙏', 'green', '신앙', 'Faith'),
    Pluto: c('amplify', 7, '🔱', 'green', '전통', 'Tradition'),
  },
};

// 행성 키워드 설명
export const PLANET_KEYWORDS = {
  Sun: { ko: '자아/정체성', en: 'Self/Identity' },
  Moon: { ko: '감정/무의식', en: 'Emotion/Unconscious' },
  Mercury: { ko: '소통/사고', en: 'Communication/Thought' },
  Venus: { ko: '사랑/아름다움', en: 'Love/Beauty' },
  Mars: { ko: '행동/에너지', en: 'Action/Energy' },
  Jupiter: { ko: '확장/행운', en: 'Expansion/Fortune' },
  Saturn: { ko: '제한/책임', en: 'Limitation/Responsibility' },
  Uranus: { ko: '혁신/자유', en: 'Innovation/Freedom' },
  Neptune: { ko: '영성/환상', en: 'Spirituality/Illusion' },
  Pluto: { ko: '변혁/권력', en: 'Transformation/Power' },
} as const;

// 십신 키워드 설명
export const SIBSIN_KEYWORDS = {
  '비견': { ko: '동류/경쟁자', en: 'Peer/Competitor' },
  '겁재': { ko: '라이벌/충동', en: 'Rival/Impulse' },
  '식신': { ko: '표현/창조', en: 'Expression/Creation' },
  '상관': { ko: '반항/날카로움', en: 'Rebellion/Sharp' },
  '편재': { ko: '투기/변재', en: 'Speculation/Variable' },
  '정재': { ko: '정재/안정', en: 'Stable Wealth' },
  '편관': { ko: '압박/권력', en: 'Pressure/Authority' },
  '정관': { ko: '명예/책임', en: 'Honor/Duty' },
  '편인': { ko: '편학/직관', en: 'Eccentric/Intuition' },
  '정인': { ko: '정학/양육', en: 'Orthodox/Nurture' },
} as const;

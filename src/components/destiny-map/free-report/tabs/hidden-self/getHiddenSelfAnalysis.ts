import type { TabProps } from '../types';
import { getShadowPersonalityAnalysis } from '../../analyzers/matrixAnalyzer';
import type { HiddenSelfAnalysis } from './types';

// 숨겨진 자아 분석 함수 (확장)
export function getHiddenSelfAnalysis(
  saju: TabProps['saju'],
  astro: TabProps['astro'],
  isKo: boolean
): HiddenSelfAnalysis | null {
  const shadowBase = getShadowPersonalityAnalysis(
    saju ?? undefined,
    astro ?? undefined,
    isKo ? 'ko' : 'en'
  );

  if (!shadowBase && !saju && !astro) {return null;}

  const dayElement = saju?.dayMaster?.element || 'wood';

  // 오행별 아이콘
  const elementIcons: Record<string, string> = {
    '목': '🌳', '화': '🔥', '토': '🏔️', '금': '⚔️', '수': '💧',
    'wood': '🌳', 'fire': '🔥', 'earth': '🏔️', 'metal': '⚔️', 'water': '💧',
  };

  // Chiron 상처 분석
  const chironWounds: Record<string, { wound: { ko: string; en: string }; healing: { ko: string; en: string }; gift: { ko: string; en: string } }> = {
    'wood': {
      wound: { ko: '자기 표현과 성장에 대한 상처', en: 'Wounds around self-expression and growth' },
      healing: { ko: '창의적 활동을 통해 치유됩니다', en: 'Healing through creative activities' },
      gift: { ko: '다른 사람의 성장을 돕는 능력', en: 'Ability to help others grow' },
    },
    'fire': {
      wound: { ko: '인정과 열정에 대한 상처', en: 'Wounds around recognition and passion' },
      healing: { ko: '자기 빛을 발하며 치유됩니다', en: 'Healing by shining your own light' },
      gift: { ko: '다른 사람에게 영감을 주는 능력', en: 'Ability to inspire others' },
    },
    'earth': {
      wound: { ko: '안정과 소속감에 대한 상처', en: 'Wounds around stability and belonging' },
      healing: { ko: '자신만의 기반을 만들며 치유됩니다', en: 'Healing by building your own foundation' },
      gift: { ko: '다른 사람에게 안정감을 주는 능력', en: 'Ability to provide stability to others' },
    },
    'metal': {
      wound: { ko: '가치와 판단에 대한 상처', en: 'Wounds around value and judgment' },
      healing: { ko: '자기 기준을 세우며 치유됩니다', en: 'Healing by establishing your own standards' },
      gift: { ko: '진정한 가치를 알아보는 능력', en: 'Ability to recognize true value' },
    },
    'water': {
      wound: { ko: '감정과 깊이에 대한 상처', en: 'Wounds around emotions and depth' },
      healing: { ko: '감정을 수용하며 치유됩니다', en: 'Healing by accepting emotions' },
      gift: { ko: '깊은 공감 능력', en: 'Deep empathy ability' },
    },
  };

  // Vertex 운명 패턴
  const vertexPatterns: Record<string, { fatePattern: { ko: string; en: string }; turningPoints: { ko: string; en: string } }> = {
    'wood': {
      fatePattern: { ko: '새로운 시작과 관련된 운명적 만남', en: 'Fated meetings related to new beginnings' },
      turningPoints: { ko: '성장과 확장의 순간에 인생이 바뀝니다', en: 'Life changes at moments of growth and expansion' },
    },
    'fire': {
      fatePattern: { ko: '열정과 창조와 관련된 운명적 만남', en: 'Fated meetings related to passion and creation' },
      turningPoints: { ko: '자기 표현의 순간에 인생이 바뀝니다', en: 'Life changes at moments of self-expression' },
    },
    'earth': {
      fatePattern: { ko: '안정과 현실화와 관련된 운명적 만남', en: 'Fated meetings related to stability and manifestation' },
      turningPoints: { ko: '기반을 다지는 순간에 인생이 바뀝니다', en: 'Life changes when building foundations' },
    },
    'metal': {
      fatePattern: { ko: '결단과 정화와 관련된 운명적 만남', en: 'Fated meetings related to decisions and purification' },
      turningPoints: { ko: '내려놓는 순간에 인생이 바뀝니다', en: 'Life changes at moments of letting go' },
    },
    'water': {
      fatePattern: { ko: '직관과 영성과 관련된 운명적 만남', en: 'Fated meetings related to intuition and spirituality' },
      turningPoints: { ko: '깊은 통찰의 순간에 인생이 바뀝니다', en: 'Life changes at moments of deep insight' },
    },
  };

  // 12하우스 무의식 패턴
  const twelfthHousePatterns: Record<string, { description: { ko: string; en: string }; advice: { ko: string; en: string } }> = {
    'wood': {
      description: { ko: '숨겨진 야망과 성장 욕구가 있습니다', en: 'Hidden ambition and desire for growth' },
      advice: { ko: '명상과 자연 속에서 내면을 탐구하세요', en: 'Explore your inner self through meditation and nature' },
    },
    'fire': {
      description: { ko: '숨겨진 창조적 에너지가 있습니다', en: 'Hidden creative energy exists' },
      advice: { ko: '혼자만의 창작 시간을 가지세요', en: 'Have alone time for creative work' },
    },
    'earth': {
      description: { ko: '숨겨진 물질적 불안이 있습니다', en: 'Hidden material insecurity exists' },
      advice: { ko: '내면의 안정감을 키우세요', en: 'Build inner sense of security' },
    },
    'metal': {
      description: { ko: '숨겨진 완벽주의 성향이 있습니다', en: 'Hidden perfectionist tendencies exist' },
      advice: { ko: '자기 용서를 연습하세요', en: 'Practice self-forgiveness' },
    },
    'water': {
      description: { ko: '숨겨진 영적 감수성이 있습니다', en: 'Hidden spiritual sensitivity exists' },
      advice: { ko: '꿈과 직관을 신뢰하세요', en: 'Trust your dreams and intuition' },
    },
  };

  // 특수 신살 분석 (괴강살, 현침살 등)
  const specialShinsalList: Array<{ shinsal: string; planet: string; description: { ko: string; en: string }; hiddenStrength: { ko: string; en: string } }> = [];

  // saju.shinsal 또는 saju.sinsal에서 특수 신살 확인
  const shinsalArray = Array.isArray(saju?.shinsal) ? saju.shinsal : [];
  const unluckyList = saju?.sinsal?.unluckyList || [];

  const specialShinsals = ['괴강살', '현침살', '양인살', '도화살'];
  const shinsalIcons: Record<string, string> = {
    '괴강살': '⚔️',
    '현침살': '🎯',
    '양인살': '🗡️',
    '도화살': '🌸',
  };

  const shinsalPlanets: Record<string, string> = {
    '괴강살': '명왕성',
    '현침살': '해왕성',
    '양인살': '화성',
    '도화살': '금성',
  };

  const shinsalDescriptions: Record<string, { description: { ko: string; en: string }; hiddenStrength: { ko: string; en: string } }> = {
    '괴강살': {
      description: { ko: '강렬한 카리스마와 결단력이 숨어있습니다', en: 'Hidden intense charisma and decisiveness' },
      hiddenStrength: { ko: '위기 상황에서 빛나는 리더십', en: 'Leadership that shines in crisis' },
    },
    '현침살': {
      description: { ko: '예리한 직관과 통찰력이 숨어있습니다', en: 'Hidden sharp intuition and insight' },
      hiddenStrength: { ko: '문제의 핵심을 꿰뚫는 능력', en: 'Ability to see the core of problems' },
    },
    '양인살': {
      description: { ko: '강한 추진력과 용기가 숨어있습니다', en: 'Hidden strong drive and courage' },
      hiddenStrength: { ko: '어려운 상황을 돌파하는 힘', en: 'Power to break through difficulties' },
    },
    '도화살': {
      description: { ko: '매력적인 카리스마가 숨어있습니다', en: 'Hidden charming charisma' },
      hiddenStrength: { ko: '사람을 끌어당기는 매력', en: 'Magnetism that attracts people' },
    },
  };

  // 신살 분석
  for (const shinsal of specialShinsals) {
    const found = shinsalArray.some((s) =>
      (typeof s === 'string' ? s : s?.shinsal || s?.name || '')?.includes(shinsal)
    ) || unluckyList.some((s) =>
      (typeof s === 'string' ? s : s?.name || '')?.includes(shinsal)
    );

    if (found && shinsalDescriptions[shinsal]) {
      specialShinsalList.push({
        shinsal,
        planet: shinsalPlanets[shinsal] || '명왕성',
        ...shinsalDescriptions[shinsal],
      });
    }
  }

  // 그림자 점수 계산
  let shadowScore = 50;
  if (shadowBase?.lilithShadow) {shadowScore += 15;}
  if (shadowBase?.hiddenPotential) {shadowScore += 10;}
  if (specialShinsalList.length > 0) {shadowScore += specialShinsalList.length * 5;}
  shadowScore = Math.min(shadowScore, 100);

  const shadowMessage = {
    ko: shadowScore >= 75
      ? '숨겨진 자아의 에너지가 매우 강합니다. 이를 인식하고 통합하면 큰 힘이 됩니다.'
      : shadowScore >= 50
      ? '숨겨진 자아와 연결할 수 있는 잠재력이 있습니다. 내면 탐구를 통해 발견하세요.'
      : '숨겨진 자아가 조용히 작용합니다. 명상이나 꿈 기록으로 접근해보세요.',
    en: shadowScore >= 75
      ? 'Hidden self energy is very strong. Recognizing and integrating it becomes great power.'
      : shadowScore >= 50
      ? 'You have potential to connect with your hidden self. Discover it through inner exploration.'
      : 'Hidden self works quietly. Try approaching through meditation or dream journaling.',
  };

  return {
    lilithShadow: shadowBase?.lilithShadow ? {
      ...shadowBase.lilithShadow,
      icon: '🌑',
      description: shadowBase.lilithShadow.shadowSelf,
      integration: shadowBase.lilithShadow.integration,
    } : null,
    hiddenPotential: shadowBase?.hiddenPotential ? {
      ...shadowBase.hiddenPotential,
      icon: '🍀',
      description: shadowBase.hiddenPotential.potential,
      activation: {
        ko: '이 잠재력을 활성화하려면 관련 영역에서 작은 시도를 해보세요',
        en: 'To activate this potential, try small attempts in related areas',
      },
    } : null,
    chiron: {
      icon: '🩹',
      element: elementIcons[dayElement] || '🌟',
      ...chironWounds[dayElement] || chironWounds['earth'],
    },
    vertex: {
      icon: '✨',
      element: elementIcons[dayElement] || '🌟',
      ...vertexPatterns[dayElement] || vertexPatterns['earth'],
    },
    specialShinsal: specialShinsalList.map((s) => ({
      ...s,
      icon: shinsalIcons[s.shinsal] || '⚡',
    })),
    twelfthHouse: {
      icon: '🌊',
      planets: [],
      ...twelfthHousePatterns[dayElement] || twelfthHousePatterns['earth'],
    },
    shadowScore,
    shadowMessage,
  };
}
